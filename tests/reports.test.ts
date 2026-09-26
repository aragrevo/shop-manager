import { beforeAll, describe, expect, it } from "vitest";
import { cancelExpense, createExpense, listExpenses } from "../server/services/expenses";
import { getProfitReport } from "../server/services/dashboard";
import { createSale } from "../server/services/sales";
import { makeProduct, makeUserWithStore, migrateTestDb } from "./helpers";

beforeAll(async () => {
  await migrateTestDb();
});

const baseExpense = {
  description: "Suministros",
  amount: 5000,
  taxAmount: 0,
  status: "paid" as const,
};

describe("expenses", () => {
  it("creates an expense and lists it", async () => {
    const { store } = await makeUserWithStore("Exp One");
    const created = await createExpense(store.id, { ...baseExpense });
    expect(created.amount).toBe(5000);

    const list = await listExpenses(store.id, {}, { page: 1, pageSize: 10 });
    expect(list.total).toBe(1);
    expect(list.rows[0]?.description).toBe("Suministros");
  });

  it("excludes cancelled expenses from cancelled status filter totals mapping", async () => {
    const { store } = await makeUserWithStore("Exp Cancel");
    const expense = await createExpense(store.id, { ...baseExpense, amount: 1000 });
    await cancelExpense(store.id, expense.id);

    const cancelled = await listExpenses(store.id, { status: "cancelled" }, { page: 1, pageSize: 10 });
    expect(cancelled.total).toBe(1);
    expect(cancelled.rows[0]?.status).toBe("cancelled");
  });
});

describe("profit report", () => {
  it("computes revenue, cost of goods, expenses and net profit", async () => {
    const { store } = await makeUserWithStore("Profit Store");
    const product = await makeProduct(store.id, {
      salePrice: 1000,
      costPrice: 400,
      stock: 10,
    });

    await createSale(store.id, {
      items: [{ productId: product.id, quantity: 5 }],
      taxAmount: 0,
    });
    await createExpense(store.id, { ...baseExpense, amount: 1000 });

    const from = new Date(Date.now() - 86_400_000);
    const to = new Date(Date.now() + 86_400_000);
    const report = await getProfitReport(store.id, from, to);

    expect(report.revenue).toBe(5000); // 5 * 1000
    expect(report.cost).toBe(2000); // 5 * 400
    expect(report.expenses).toBe(1000);
    expect(report.profit).toBe(2000); // 5000 - 2000 - 1000
  });

  it("ignores cancelled expenses in the report", async () => {
    const { store } = await makeUserWithStore("Profit Cancel");
    const expense = await createExpense(store.id, { ...baseExpense, amount: 3000 });
    await cancelExpense(store.id, expense.id);

    const from = new Date(Date.now() - 86_400_000);
    const to = new Date(Date.now() + 86_400_000);
    const report = await getProfitReport(store.id, from, to);
    expect(report.expenses).toBe(0);
  });
});
