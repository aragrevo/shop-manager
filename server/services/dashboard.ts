import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { customers, expenses, products, saleItems, sales } from "../db/schema.js";
import type { Period } from "../../src/schemas/common.js";
import {
  costOfGoods,
  expensesByBucket,
  expensesTotal,
  resolvePeriod,
  salesByBucket,
  salesTotal,
} from "./reports.js";

export interface DashboardKpis {
  sales: number;
  expenses: number;
  profit: number;
  cash: number;
  salesCount: number;
  delta: {
    sales: number | null;
    expenses: number | null;
    profit: number | null;
  };
}

export interface DashboardSeriesPoint {
  bucket: string;
  sales: number;
  expenses: number;
  profit: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  series: DashboardSeriesPoint[];
  topProducts: {
    productId: string | null;
    name: string | null;
    quantity: number;
    revenue: number;
  }[];
  recentSales: {
    id: string;
    total: number;
    status: "completed" | "cancelled";
    saleDate: Date;
    customerName: string | null;
  }[];
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

async function getCashOnHand(storeId: string): Promise<number> {
  const db = getDb();
  const [salesRow] = await db
    .select({ total: sql<number>`coalesce(sum(${sales.total}), 0)` })
    .from(sales)
    .where(and(eq(sales.storeId, storeId), eq(sales.status, "completed")));
  const [expensesRow] = await db
    .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
    .from(expenses)
    .where(
      and(eq(expenses.storeId, storeId), ne(expenses.status, "cancelled")),
    );
  return Number(salesRow?.total ?? 0) - Number(expensesRow?.total ?? 0);
}

export async function getDashboard(
  storeId: string,
  period: Period,
): Promise<DashboardData> {
  const db = getDb();
  const { range, previous, bucket } = resolvePeriod(period);

  const [
    salesNow,
    expensesNow,
    salesPrev,
    expensesPrev,
    salesSeries,
    expensesSeries,
    cash,
  ] = await Promise.all([
    salesTotal(storeId, range),
    expensesTotal(storeId, range),
    salesTotal(storeId, previous),
    expensesTotal(storeId, previous),
    salesByBucket(storeId, range, bucket),
    expensesByBucket(storeId, range, bucket),
    getCashOnHand(storeId),
  ]);

  const profit = salesNow.total - expensesNow.total;
  const profitPrev = salesPrev.total - expensesPrev.total;

  const salesMap = new Map(salesSeries.map((r) => [r.bucket, Number(r.total)]));
  const expensesMap = new Map(
    expensesSeries.map((r) => [r.bucket, Number(r.total)]),
  );
  const buckets = [...new Set([...salesMap.keys(), ...expensesMap.keys()])].sort();

  const series: DashboardSeriesPoint[] = buckets.map((key) => {
    const salesValue = salesMap.get(key) ?? 0;
    const expensesValue = expensesMap.get(key) ?? 0;
    return {
      bucket: key,
      sales: salesValue,
      expenses: expensesValue,
      profit: salesValue - expensesValue,
    };
  });

  const topProductsRows = await db
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
    .orderBy(desc(sql`coalesce(sum(${saleItems.subtotal}), 0)`))
    .limit(5);

  const recentSales = await db
    .select({
      id: sales.id,
      total: sales.total,
      status: sales.status,
      saleDate: sales.saleDate,
      customerName: customers.name,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.storeId, storeId))
    .orderBy(desc(sales.saleDate))
    .limit(5);

  return {
    kpis: {
      sales: salesNow.total,
      expenses: expensesNow.total,
      profit,
      cash,
      salesCount: salesNow.count,
      delta: {
        sales: pctChange(salesNow.total, salesPrev.total),
        expenses: pctChange(expensesNow.total, expensesPrev.total),
        profit: pctChange(profit, profitPrev),
      },
    },
    series,
    topProducts: topProductsRows.map((row) => ({
      productId: row.productId,
      name: row.name,
      quantity: Number(row.quantity),
      revenue: Number(row.revenue),
    })),
    recentSales,
  };
}

export async function getProfitReport(
  storeId: string,
  from: Date,
  to: Date,
): Promise<{ revenue: number; cost: number; expenses: number; profit: number }> {
  const [revenue, expensesResult, cost] = await Promise.all([
    salesTotal(storeId, { from, to }),
    expensesTotal(storeId, { from, to }),
    costOfGoods(storeId, { from, to }),
  ]);
  const grossProfit = revenue.total - cost;
  const netProfit = grossProfit - expensesResult.total;
  return {
    revenue: revenue.total,
    cost,
    expenses: expensesResult.total,
    profit: netProfit,
  };
}
