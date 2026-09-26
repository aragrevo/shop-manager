import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { categories, expenses } from "../db/schema.js";
import type { ExpenseInput } from "../../src/schemas/expense.js";
import { NotFoundError } from "./errors.js";

export interface ExpenseFilters {
  status?: "pending" | "paid" | "cancelled";
  categoryId?: string;
  from?: Date;
  to?: Date;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export interface ListOptions {
  page: number;
  pageSize: number;
}

export async function listExpenses(
  storeId: string,
  filters: ExpenseFilters,
  options: ListOptions,
) {
  const db = getDb();
  const conditions = [eq(expenses.storeId, storeId)];
  if (filters.status) conditions.push(eq(expenses.status, filters.status));
  if (filters.categoryId)
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  if (filters.from) conditions.push(gte(expenses.expenseDate, filters.from));
  if (filters.to) conditions.push(lte(expenses.expenseDate, filters.to));
  if (filters.search) {
    conditions.push(
      sql`(${expenses.description} LIKE ${"%" + filters.search + "%"} OR ${expenses.supplier} LIKE ${"%" + filters.search + "%"})`,
    );
  }
  const where = and(...conditions);

  const sortColumn =
    filters.sort === "amount"
      ? expenses.amount
      : filters.sort === "description"
        ? expenses.description
        : expenses.expenseDate;
  const orderBy = filters.order === "asc" ? asc(sortColumn) : desc(sortColumn);

  const rows = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      supplier: expenses.supplier,
      amount: expenses.amount,
      taxAmount: expenses.taxAmount,
      status: expenses.status,
      paymentMethod: expenses.paymentMethod,
      expenseDate: expenses.expenseDate,
      categoryId: expenses.categoryId,
      categoryName: categories.name,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(where)
    .orderBy(orderBy)
    .limit(options.pageSize)
    .offset((options.page - 1) * options.pageSize);

  const [totalRow] = await db
    .select({ value: count() })
    .from(expenses)
    .where(where);

  return { rows, total: totalRow?.value ?? 0 };
}

export async function getExpense(storeId: string, expenseId: string) {
  const [row] = await getDb()
    .select()
    .from(expenses)
    .where(and(eq(expenses.storeId, storeId), eq(expenses.id, expenseId)));
  if (!row) throw new NotFoundError("Gasto no encontrado");
  return row;
}

export async function createExpense(storeId: string, input: ExpenseInput) {
  const [row] = await getDb()
    .insert(expenses)
    .values({
      storeId,
      description: input.description,
      categoryId: input.categoryId ?? null,
      supplier: input.supplier ?? null,
      amount: input.amount,
      taxAmount: input.taxAmount,
      paymentMethod: input.paymentMethod ?? null,
      expenseDate: input.expenseDate ?? new Date(),
      status: input.status,
      notes: input.notes ?? null,
      receiptUrl: input.receiptUrl ? input.receiptUrl : null,
    })
    .returning();
  if (!row) throw new NotFoundError("No se pudo crear el gasto");
  return row;
}

export async function updateExpense(
  storeId: string,
  expenseId: string,
  input: ExpenseInput,
) {
  await getExpense(storeId, expenseId);
  const [row] = await getDb()
    .update(expenses)
    .set({
      description: input.description,
      categoryId: input.categoryId ?? null,
      supplier: input.supplier ?? null,
      amount: input.amount,
      taxAmount: input.taxAmount,
      paymentMethod: input.paymentMethod ?? null,
      expenseDate: input.expenseDate ?? new Date(),
      status: input.status,
      notes: input.notes ?? null,
      receiptUrl: input.receiptUrl ? input.receiptUrl : null,
      updatedAt: new Date(),
    })
    .where(and(eq(expenses.storeId, storeId), eq(expenses.id, expenseId)))
    .returning();
  if (!row) throw new NotFoundError("Gasto no encontrado");
  return row;
}

export async function cancelExpense(
  storeId: string,
  expenseId: string,
): Promise<void> {
  await getExpense(storeId, expenseId);
  await getDb()
    .update(expenses)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(expenses.storeId, storeId), eq(expenses.id, expenseId)));
}

export async function deleteExpense(
  storeId: string,
  expenseId: string,
): Promise<void> {
  await getExpense(storeId, expenseId);
  await getDb()
    .delete(expenses)
    .where(and(eq(expenses.storeId, storeId), eq(expenses.id, expenseId)));
}
