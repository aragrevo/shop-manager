import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { categories, products } from "../db/schema";
import type { ProductInput } from "@/schemas/product";
import { NotFoundError } from "./errors";

export interface ProductFilters {
  categoryId?: string;
  active?: boolean;
  lowStock?: boolean;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export interface ListOptions {
  page: number;
  pageSize: number;
}

export async function listProducts(
  storeId: string,
  filters: ProductFilters,
  options: ListOptions,
) {
  const db = getDb();
  const conditions = [eq(products.storeId, storeId)];
  if (filters.categoryId)
    conditions.push(eq(products.categoryId, filters.categoryId));
  if (filters.active !== undefined)
    conditions.push(eq(products.active, filters.active));
  if (filters.lowStock) {
    conditions.push(sql`${products.stock} <= ${products.minimumStock}`);
  }
  if (filters.search) {
    conditions.push(
      sql`(${products.name} LIKE ${"%" + filters.search + "%"} OR ${products.sku} LIKE ${"%" + filters.search + "%"})`,
    );
  }
  const where = and(...conditions);

  const sortColumn =
    filters.sort === "name"
      ? products.name
      : filters.sort === "price"
        ? products.salePrice
        : filters.sort === "stock"
          ? products.stock
          : products.createdAt;
  const orderBy = filters.order === "asc" ? asc(sortColumn) : desc(sortColumn);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      categoryId: products.categoryId,
      categoryName: categories.name,
      salePrice: products.salePrice,
      costPrice: products.costPrice,
      stock: products.stock,
      minimumStock: products.minimumStock,
      active: products.active,
      imageUrl: products.imageUrl,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(orderBy)
    .limit(options.pageSize)
    .offset((options.page - 1) * options.pageSize);

  const [totalRow] = await db
    .select({ value: count() })
    .from(products)
    .where(where);

  return { rows, total: totalRow?.value ?? 0 };
}

export async function getProduct(storeId: string, productId: string) {
  const [row] = await getDb()
    .select()
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.id, productId)));
  if (!row) throw new NotFoundError("Producto no encontrado");
  return row;
}

export async function createProduct(storeId: string, input: ProductInput) {
  const [row] = await getDb()
    .insert(products)
    .values({
      storeId,
      name: input.name,
      sku: input.sku ?? null,
      categoryId: input.categoryId ?? null,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      salePrice: input.salePrice,
      costPrice: input.costPrice,
      stock: input.stock,
      minimumStock: input.minimumStock,
      active: input.active,
    })
    .returning();
  if (!row) throw new NotFoundError("No se pudo crear el producto");
  return row;
}

export async function updateProduct(
  storeId: string,
  productId: string,
  input: ProductInput,
) {
  const db = getDb();
  await getProduct(storeId, productId);
  const [row] = await db
    .update(products)
    .set({
      name: input.name,
      sku: input.sku ?? null,
      categoryId: input.categoryId ?? null,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      salePrice: input.salePrice,
      costPrice: input.costPrice,
      stock: input.stock,
      minimumStock: input.minimumStock,
      active: input.active,
      updatedAt: new Date(),
    })
    .where(and(eq(products.storeId, storeId), eq(products.id, productId)))
    .returning();
  if (!row) throw new NotFoundError("Producto no encontrado");
  return row;
}

/** Soft delete: keeps sales/inventory history intact. */
export async function deactivateProduct(
  storeId: string,
  productId: string,
): Promise<void> {
  const db = getDb();
  await getProduct(storeId, productId);
  await db
    .update(products)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(products.storeId, storeId), eq(products.id, productId)));
}

export interface InventoryStats {
  productCount: number;
  totalUnits: number;
  inventoryCostValue: number;
  inventorySaleValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export async function getInventoryStats(
  storeId: string,
): Promise<InventoryStats> {
  const [row] = await getDb()
    .select({
      productCount: count(),
      totalUnits: sql<number>`coalesce(sum(${products.stock}), 0)`,
      inventoryCostValue: sql<number>`coalesce(sum(${products.stock} * ${products.costPrice}), 0)`,
      inventorySaleValue: sql<number>`coalesce(sum(${products.stock} * ${products.salePrice}), 0)`,
      lowStockCount: sql<number>`coalesce(sum(case when ${products.stock} <= ${products.minimumStock} and ${products.stock} > 0 then 1 else 0 end), 0)`,
      outOfStockCount: sql<number>`coalesce(sum(case when ${products.stock} = 0 then 1 else 0 end), 0)`,
    })
    .from(products)
    .where(eq(products.storeId, storeId));

  return {
    productCount: row?.productCount ?? 0,
    totalUnits: Number(row?.totalUnits ?? 0),
    inventoryCostValue: Number(row?.inventoryCostValue ?? 0),
    inventorySaleValue: Number(row?.inventorySaleValue ?? 0),
    lowStockCount: Number(row?.lowStockCount ?? 0),
    outOfStockCount: Number(row?.outOfStockCount ?? 0),
  };
}
