import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { categories, expenses, products, saleItems, sales } from "../db/schema.js";
import type { Period } from "../../src/schemas/common.js";

export interface DateRange {
  from: Date;
  to: Date;
}

export type Bucket = "day" | "month";

export function resolvePeriod(
  period: Period,
  now: Date = new Date(),
): { range: DateRange; previous: DateRange; bucket: Bucket } {
  const to = now;
  const start = new Date(now);
  let bucket: Bucket = "day";

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "7d":
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case "3m":
      start.setMonth(start.getMonth() - 3);
      bucket = "month";
      break;
    case "12m":
      start.setFullYear(start.getFullYear() - 1);
      bucket = "month";
      break;
  }

  const spanMs = to.getTime() - start.getTime();
  const previous: DateRange = {
    from: new Date(start.getTime() - spanMs),
    to: start,
  };

  return { range: { from: start, to }, previous, bucket };
}

export function customRange(from: Date, to: Date): { range: DateRange; bucket: Bucket } {
  const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
  return { range: { from, to }, bucket: spanDays > 92 ? "month" : "day" };
}

export async function salesTotal(storeId: string, range: DateRange) {
  const [row] = await getDb()
    .select({
      total: sql<number>`coalesce(sum(${sales.total}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.storeId, storeId),
        eq(sales.status, "completed"),
        gte(sales.saleDate, range.from),
        lte(sales.saleDate, range.to),
      ),
    );
  return { total: Number(row?.total ?? 0), count: Number(row?.count ?? 0) };
}

export async function expensesTotal(storeId: string, range: DateRange) {
  const [row] = await getDb()
    .select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.storeId, storeId),
        ne(expenses.status, "cancelled"),
        gte(expenses.expenseDate, range.from),
        lte(expenses.expenseDate, range.to),
      ),
    );
  return { total: Number(row?.total ?? 0), count: Number(row?.count ?? 0) };
}

export async function costOfGoods(storeId: string, range: DateRange) {
  const [row] = await getDb()
    .select({
      total: sql<number>`coalesce(sum(${saleItems.costPrice} * ${saleItems.quantity}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.storeId, storeId),
        eq(sales.status, "completed"),
        gte(sales.saleDate, range.from),
        lte(sales.saleDate, range.to),
      ),
    );
  return Number(row?.total ?? 0);
}

function bucketExpr(bucket: Bucket) {
  return bucket === "month"
    ? sql<string>`strftime('%Y-%m', ${sales.saleDate}, 'unixepoch')`
    : sql<string>`strftime('%Y-%m-%d', ${sales.saleDate}, 'unixepoch')`;
}

export async function salesByBucket(
  storeId: string,
  range: DateRange,
  bucket: Bucket,
) {
  return getDb()
    .select({
      bucket: bucketExpr(bucket).as("bucket"),
      total: sql<number>`coalesce(sum(${sales.total}), 0)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.storeId, storeId),
        eq(sales.status, "completed"),
        gte(sales.saleDate, range.from),
        lte(sales.saleDate, range.to),
      ),
    )
    .groupBy(sql`bucket`)
    .orderBy(sql`bucket`);
}

export async function expensesByBucket(
  storeId: string,
  range: DateRange,
  bucket: Bucket,
) {
  const bucketCol =
    bucket === "month"
      ? sql<string>`strftime('%Y-%m', ${expenses.expenseDate}, 'unixepoch')`
      : sql<string>`strftime('%Y-%m-%d', ${expenses.expenseDate}, 'unixepoch')`;
  return getDb()
    .select({
      bucket: bucketCol.as("bucket"),
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.storeId, storeId),
        ne(expenses.status, "cancelled"),
        gte(expenses.expenseDate, range.from),
        lte(expenses.expenseDate, range.to),
      ),
    )
    .groupBy(sql`bucket`)
    .orderBy(sql`bucket`);
}

export async function salesByProduct(
  storeId: string,
  range: DateRange,
  limit = 10,
) {
  return getDb()
    .select({
      productId: saleItems.productId,
      name: products.name,
      quantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
      revenue: sql<number>`coalesce(sum(${saleItems.subtotal}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(
      and(
        eq(sales.storeId, storeId),
        eq(sales.status, "completed"),
        gte(sales.saleDate, range.from),
        lte(sales.saleDate, range.to),
      ),
    )
    .groupBy(saleItems.productId)
    .orderBy(desc(sql`revenue`))
    .limit(limit);
}

export async function salesByCategory(storeId: string, range: DateRange) {
  return getDb()
    .select({
      categoryId: categories.id,
      name: categories.name,
      revenue: sql<number>`coalesce(sum(${saleItems.subtotal}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .leftJoin(products, eq(saleItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(sales.storeId, storeId),
        eq(sales.status, "completed"),
        gte(sales.saleDate, range.from),
        lte(sales.saleDate, range.to),
      ),
    )
    .groupBy(categories.id)
    .orderBy(desc(sql`revenue`));
}

export async function expensesByCategory(storeId: string, range: DateRange) {
  return getDb()
    .select({
      categoryId: categories.id,
      name: categories.name,
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(
      and(
        eq(expenses.storeId, storeId),
        ne(expenses.status, "cancelled"),
        gte(expenses.expenseDate, range.from),
        lte(expenses.expenseDate, range.to),
      ),
    )
    .groupBy(categories.id)
    .orderBy(desc(sql`total`));
}

export function toCsv(rows: readonly Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const escape = (value: unknown): string => {
    const text = value == null ? "" : String(value);
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header])).join(","));
  }
  return lines.join("\n");
}
