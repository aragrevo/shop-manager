import {
  customRange,
  expensesByCategory,
  expensesTotal,
  resolvePeriod,
  salesByCategory,
  salesByProduct,
  salesByBucket,
  expensesByBucket,
  salesTotal,
  toCsv,
} from "../../server/services/reports.js";
import { getProfitReport } from "../../server/services/dashboard.js";
import type { Period } from "../../src/schemas/common.js";
import { handler } from "../_lib/handler.js";

function resolveRange(query: Record<string, unknown>) {
  if (typeof query.from === "string" && typeof query.to === "string") {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const { range, bucket } = customRange(from, to);
    return { range, bucket };
  }
  const period = (typeof query.period === "string" ? query.period : "30d") as Period;
  const { range, bucket } = resolvePeriod(period);
  return { range, bucket };
}

export default handler(
  {
    GET: async ({ req, res, storeId }) => {
      const sid = storeId as string;
      const view = typeof req.query.view === "string" ? req.query.view : "summary";
      const { range, bucket } = resolveRange(req.query);

      let rows: Record<string, unknown>[] = [];
      let payload: unknown;

      switch (view) {
        case "sales":
          rows = (await salesByBucket(sid, range, bucket)).map((r) => ({
            periodo: r.bucket,
            ventas_eur: (Number(r.total) / 100).toFixed(2),
          }));
          payload = rows;
          break;
        case "expenses":
          rows = (await expensesByBucket(sid, range, bucket)).map((r) => ({
            periodo: r.bucket,
            gastos_eur: (Number(r.total) / 100).toFixed(2),
          }));
          payload = rows;
          break;
        case "by-product":
          rows = (await salesByProduct(sid, range, 50)).map((r) => ({
            producto: r.name ?? "—",
            unidades: Number(r.quantity),
            ingresos_eur: (Number(r.revenue) / 100).toFixed(2),
          }));
          payload = rows;
          break;
        case "by-category":
          rows = (await salesByCategory(sid, range)).map((r) => ({
            categoria: r.name ?? "Sin categoría",
            ingresos_eur: (Number(r.revenue) / 100).toFixed(2),
          }));
          payload = rows;
          break;
        case "expenses-by-category":
          rows = (await expensesByCategory(sid, range)).map((r) => ({
            categoria: r.name ?? "Sin categoría",
            gastos_eur: (Number(r.total) / 100).toFixed(2),
          }));
          payload = rows;
          break;
        case "profit": {
          const report = await getProfitReport(sid, range.from, range.to);
          payload = report;
          rows = [
            { concepto: "Ingresos", importe_eur: (report.revenue / 100).toFixed(2) },
            { concepto: "Coste de ventas", importe_eur: (report.cost / 100).toFixed(2) },
            { concepto: "Gastos", importe_eur: (report.expenses / 100).toFixed(2) },
            { concepto: "Beneficio", importe_eur: (report.profit / 100).toFixed(2) },
          ];
          break;
        }
        default: {
          const [sales, expenses] = await Promise.all([
            salesTotal(sid, range),
            expensesTotal(sid, range),
          ]);
          payload = {
            range: { from: range.from, to: range.to },
            sales: sales.total,
            expenses: expenses.total,
            profit: sales.total - expenses.total,
            series: {
              sales: await salesByBucket(sid, range, bucket),
              expenses: await expensesByBucket(sid, range, bucket),
            },
          };
          rows = [];
          break;
        }
      }

      if (req.query.export === "csv") {
        const csv = toCsv(rows.length > 0 ? rows : [{ resultado: "sin datos" }]);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="informe-${view}.csv"`,
        );
        res.status(200).send(csv);
        return;
      }

      return payload;
    },
  },
  { store: true },
);
