import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { customers, sales } from "../db/schema";
import type { CustomerInput } from "../../src/schemas/customer";
import { NotFoundError } from "./errors";

export interface ListOptions {
  page: number;
  pageSize: number;
}

export interface CustomerWithStats {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  purchaseCount: number;
  totalSpent: number;
  lastPurchaseAt: Date | null;
}

export async function listCustomers(
  storeId: string,
  options: ListOptions & { search?: string },
) {
  const db = getDb();
  const conditions = [eq(customers.storeId, storeId)];
  if (options.search) {
    conditions.push(
      sql`(${customers.name} LIKE ${"%" + options.search + "%"} OR ${customers.email} LIKE ${"%" + options.search + "%"})`,
    );
  }
  const where = and(...conditions);

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      createdAt: customers.createdAt,
      purchaseCount: sql<number>`count(${sales.id})`,
      totalSpent: sql<number>`coalesce(sum(case when ${sales.status} = 'completed' then ${sales.total} else 0 end), 0)`,
      lastPurchaseAt: sql<number | null>`max(${sales.saleDate})`,
    })
    .from(customers)
    .leftJoin(sales, eq(sales.customerId, customers.id))
    .where(where)
    .groupBy(customers.id)
    .orderBy(asc(customers.name))
    .limit(options.pageSize)
    .offset((options.page - 1) * options.pageSize);

  const [totalRow] = await db
    .select({ value: count() })
    .from(customers)
    .where(where);

  const mapped: CustomerWithStats[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt,
    purchaseCount: Number(row.purchaseCount),
    totalSpent: Number(row.totalSpent),
    lastPurchaseAt:
      row.lastPurchaseAt != null ? new Date(Number(row.lastPurchaseAt) * 1000) : null,
  }));

  return { rows: mapped, total: totalRow?.value ?? 0 };
}

export async function getCustomer(storeId: string, customerId: string) {
  const [row] = await getDb()
    .select()
    .from(customers)
    .where(and(eq(customers.storeId, storeId), eq(customers.id, customerId)));
  if (!row) throw new NotFoundError("Cliente no encontrado");
  return row;
}

export async function getCustomerHistory(storeId: string, customerId: string) {
  await getCustomer(storeId, customerId);
  return getDb()
    .select({
      id: sales.id,
      total: sales.total,
      status: sales.status,
      saleDate: sales.saleDate,
      paymentMethod: sales.paymentMethod,
    })
    .from(sales)
    .where(and(eq(sales.storeId, storeId), eq(sales.customerId, customerId)))
    .orderBy(desc(sales.saleDate));
}

export async function createCustomer(storeId: string, input: CustomerInput) {
  const [row] = await getDb()
    .insert(customers)
    .values({
      storeId,
      name: input.name,
      email: input.email ? input.email : null,
      phone: input.phone ? input.phone : null,
      notes: input.notes ?? null,
    })
    .returning();
  if (!row) throw new NotFoundError("No se pudo crear el cliente");
  return row;
}

export async function updateCustomer(
  storeId: string,
  customerId: string,
  input: CustomerInput,
) {
  await getCustomer(storeId, customerId);
  const [row] = await getDb()
    .update(customers)
    .set({
      name: input.name,
      email: input.email ? input.email : null,
      phone: input.phone ? input.phone : null,
      notes: input.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(customers.storeId, storeId), eq(customers.id, customerId)))
    .returning();
  if (!row) throw new NotFoundError("Cliente no encontrado");
  return row;
}

export async function deleteCustomer(
  storeId: string,
  customerId: string,
): Promise<void> {
  await getCustomer(storeId, customerId);
  await getDb()
    .delete(customers)
    .where(and(eq(customers.storeId, storeId), eq(customers.id, customerId)));
}
