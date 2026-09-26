import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  customers,
  inventoryMovements,
  products,
  saleItems,
  sales,
} from "../db/schema";
import type { SaleInput } from "../../src/schemas/sale";
import { ConflictError, NotFoundError } from "./errors";

export interface SaleListFilters {
  status?: "completed" | "cancelled";
  customerId?: string;
  from?: Date;
  to?: Date;
}

export interface ListOptions {
  page: number;
  pageSize: number;
}

export async function listSales(
  storeId: string,
  filters: SaleListFilters,
  options: ListOptions,
) {
  const db = getDb();
  const conditions = [eq(sales.storeId, storeId)];
  if (filters.status) conditions.push(eq(sales.status, filters.status));
  if (filters.customerId)
    conditions.push(eq(sales.customerId, filters.customerId));
  if (filters.from) conditions.push(gte(sales.saleDate, filters.from));
  if (filters.to) conditions.push(lte(sales.saleDate, filters.to));
  const where = and(...conditions);

  const rows = await db
    .select({
      id: sales.id,
      total: sales.total,
      taxAmount: sales.taxAmount,
      status: sales.status,
      paymentMethod: sales.paymentMethod,
      saleDate: sales.saleDate,
      customerId: sales.customerId,
      customerName: customers.name,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(where)
    .orderBy(desc(sales.saleDate))
    .limit(options.pageSize)
    .offset((options.page - 1) * options.pageSize);

  const [totalRow] = await db
    .select({ value: count() })
    .from(sales)
    .where(where);

  return { rows, total: totalRow?.value ?? 0 };
}

export async function getSale(storeId: string, saleId: string) {
  const db = getDb();
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.storeId, storeId), eq(sales.id, saleId)));
  if (!sale) throw new NotFoundError("Venta no encontrada");

  const items = await db
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      productName: products.name,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      costPrice: saleItems.costPrice,
      subtotal: saleItems.subtotal,
    })
    .from(saleItems)
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, saleId));

  return { ...sale, items };
}

export interface CreateSaleResult {
  saleId: string;
  total: number;
}

/**
 * Creates a sale atomically: validates stock, writes sale + items, decrements
 * stock and records inventory movements inside one transaction. If anything
 * fails, nothing is persisted.
 */
export async function createSale(
  storeId: string,
  input: SaleInput,
): Promise<CreateSaleResult> {
  const db = getDb();

  // Aggregate quantities in case the client repeats a product line.
  const quantityByProduct = new Map<string, number>();
  for (const item of input.items) {
    quantityByProduct.set(
      item.productId,
      (quantityByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }
  const productIds = [...quantityByProduct.keys()];

  return db.transaction(async (tx) => {
    const found = await tx
      .select()
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          inArray(products.id, productIds),
        ),
      );

    if (found.length !== productIds.length) {
      throw new NotFoundError("Uno o más productos no existen en esta tienda");
    }

    const lines = found.map((product) => {
      const quantity = quantityByProduct.get(product.id) ?? 0;
      if (!product.active) {
        throw new ConflictError(`El producto "${product.name}" no está activo`);
      }
      if (product.stock < quantity) {
        throw new ConflictError(
          `Stock insuficiente para "${product.name}" (disponible: ${product.stock})`,
        );
      }
      return {
        productId: product.id,
        quantity,
        unitPrice: product.salePrice,
        costPrice: product.costPrice,
        subtotal: quantity * product.salePrice,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const taxAmount = input.taxAmount ?? 0;
    const total = subtotal + taxAmount;

    const [sale] = await tx
      .insert(sales)
      .values({
        storeId,
        customerId: input.customerId ?? null,
        total,
        taxAmount,
        paymentMethod: input.paymentMethod ?? null,
        status: "completed",
        saleDate: input.saleDate ?? new Date(),
        notes: input.notes ?? null,
      })
      .returning();
    if (!sale) throw new ConflictError("No se pudo crear la venta");

    await tx
      .insert(saleItems)
      .values(lines.map((line) => ({ saleId: sale.id, ...line })));

    for (const line of lines) {
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${line.quantity}` })
        .where(eq(products.id, line.productId));
    }

    await tx.insert(inventoryMovements).values(
      lines.map((line) => ({
        storeId,
        productId: line.productId,
        type: "sale" as const,
        quantity: -line.quantity,
        referenceId: sale.id,
        notes: "Venta",
      })),
    );

    return { saleId: sale.id, total };
  });
}

export async function cancelSale(
  storeId: string,
  saleId: string,
): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    const [sale] = await tx
      .select()
      .from(sales)
      .where(and(eq(sales.storeId, storeId), eq(sales.id, saleId)));
    if (!sale) throw new NotFoundError("Venta no encontrada");
    if (sale.status === "cancelled") {
      throw new ConflictError("La venta ya está cancelada");
    }

    const items = await tx
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));

    await tx
      .update(sales)
      .set({ status: "cancelled" })
      .where(eq(sales.id, saleId));

    for (const item of items) {
      if (!item.productId) continue;
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} + ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }

    const movements = items
      .filter((item) => item.productId !== null)
      .map((item) => ({
        storeId,
        productId: item.productId as string,
        type: "return" as const,
        quantity: item.quantity,
        referenceId: saleId,
        notes: "Cancelación de venta",
      }));
    if (movements.length > 0) {
      await tx.insert(inventoryMovements).values(movements);
    }
  });
}
