import { useState } from "react";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, buildQuery, downloadCsv } from "@/lib/api";
import { formatCurrency } from "@/lib/money";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { StatCard } from "@/components/ui/StatCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";

type View =
  | "summary"
  | "sales"
  | "expenses"
  | "by-product"
  | "by-category"
  | "expenses-by-category"
  | "profit";

const views: { value: View; label: string }[] = [
  { value: "summary", label: "Resumen" },
  { value: "sales", label: "Ventas" },
  { value: "expenses", label: "Gastos" },
  { value: "by-product", label: "Por producto" },
  { value: "by-category", label: "Por categoría" },
  { value: "expenses-by-category", label: "Gastos por categoría" },
  { value: "profit", label: "Beneficio" },
];

const periods = [
  { value: "7d", label: "Semana" },
  { value: "30d", label: "Mes" },
  { value: "3m", label: "Trimestre" },
  { value: "12m", label: "Año" },
  { value: "custom", label: "Personalizado" },
];

interface SummaryPayload {
  sales: number;
  expenses: number;
  profit: number;
  series: {
    sales: { bucket: string; total: number }[];
    expenses: { bucket: string; total: number }[];
  };
}

export function ReportsPage() {
  const { activeStore } = useAuth();
  const toast = useToast();
  const [view, setView] = useState<View>("summary");
  const [period, setPeriod] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const currency = activeStore?.currency ?? "EUR";
  const usingCustom = period === "custom" && from && to;
  const params = usingCustom
    ? { view, from, to }
    : { view, period };

  const state = useAsync<unknown>(
    (signal) => api.get(`/reports?${buildQuery(params)}`, signal),
    `${activeStore?.id ?? "none"}:${view}:${period}:${from}:${to}`,
  );

  const onExport = async () => {
    setExporting(true);
    try {
      await downloadCsv(
        `/reports?${buildQuery({ ...params, export: "csv" })}`,
        `informe-${view}.csv`,
      );
    } catch {
      toast.error("No se pudo exportar");
    } finally {
      setExporting(false);
    }
  };

  const rows = Array.isArray(state.data) ? (state.data as Record<string, unknown>[]) : [];
  const summary =
    state.data && !Array.isArray(state.data) ? (state.data as SummaryPayload) : null;

  const chartData = summary
    ? buildChartData(summary)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Informes</h1>
          <p className="text-sm text-neutral-500">Análisis de ventas, gastos y beneficio</p>
        </div>
        <Button variant="outline" onClick={onExport} isLoading={exporting}>
          <Download className="h-4 w-4" aria-hidden="true" /> Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Select
          label="Informe"
          options={views}
          value={view}
          onChange={(event) => setView(event.target.value as View)}
        />
        <Select
          label="Periodo"
          options={periods}
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        />
        {period === "custom" ? (
          <div className="grid grid-cols-2 gap-2">
            <DatePicker label="Desde" value={from} onChange={(e) => setFrom(e.target.value)} />
            <DatePicker label="Hasta" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        ) : null}
      </div>

      {state.loading ? (
        <LoadingState />
      ) : state.error ? (
        <ErrorState description="No hemos podido cargar el informe." onRetry={state.refetch} />
      ) : view === "summary" && summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Ingresos" value={formatCurrency(summary.sales, currency)} />
            <StatCard label="Gastos" value={formatCurrency(summary.expenses, currency)} />
            <StatCard label="Beneficio" value={formatCurrency(summary.profit, currency)} />
          </div>
          <Card>
            <CardHeader title="Evolución" />
            <CardContent>
              {chartData.length === 0 ? (
                <EmptyState title="Sin datos en el periodo" />
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} width={56} />
                      <Tooltip
                        formatter={(value) => formatCurrency(Math.round(Number(value ?? 0) * 100), currency)}
                      />
                      <Legend />
                      <Bar dataKey="salesEur" name="Ventas" fill="#3366ff" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expensesEur" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profitEur" name="Beneficio" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : rows.length === 0 ? (
        <EmptyState title="Sin datos para este informe" />
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                {Object.keys(rows[0] as Record<string, unknown>).map((key) => (
                  <TableHeaderCell key={key}>{key.replace(/_/g, " ")}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  {Object.keys(rows[0] as Record<string, unknown>).map((key) => (
                    <TableCell key={key}>{String(row[key] ?? "—")}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function buildChartData(summary: SummaryPayload) {
  const map = new Map<string, { label: string; salesEur: number; expensesEur: number; profitEur: number }>();
  for (const point of summary.series.sales) {
    map.set(point.bucket, {
      label: point.bucket,
      salesEur: Number(point.total) / 100,
      expensesEur: 0,
      profitEur: 0,
    });
  }
  for (const point of summary.series.expenses) {
    const entry = map.get(point.bucket) ?? {
      label: point.bucket,
      salesEur: 0,
      expensesEur: 0,
      profitEur: 0,
    };
    entry.expensesEur = Number(point.total) / 100;
    map.set(point.bucket, entry);
  }
  return [...map.values()]
    .map((entry) => ({
      ...entry,
      profitEur: entry.salesEur - entry.expensesEur,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
