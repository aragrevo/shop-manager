import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Banknote, Plus, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { api, buildQuery } from "@/lib/api";
import { formatCurrency } from "@/lib/money";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { useState } from "react";

type Period = "today" | "7d" | "30d" | "3m" | "12m";

interface DashboardData {
  kpis: {
    sales: number;
    expenses: number;
    profit: number;
    cash: number;
    salesCount: number;
    delta: { sales: number | null; expenses: number | null; profit: number | null };
  };
  series: { bucket: string; sales: number; expenses: number; profit: number }[];
  topProducts: { productId: string | null; name: string | null; quantity: number; revenue: number }[];
  recentSales: {
    id: string;
    total: number;
    status: "completed" | "cancelled";
    saleDate: string;
    customerName: string | null;
  }[];
}

const periods: { value: Period; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "3m", label: "3 meses" },
  { value: "12m", label: "12 meses" },
];

function deltaProps(value: number | null) {
  if (value === null) return undefined;
  return {
    value: `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
    direction: value > 0 ? ("up" as const) : value < 0 ? ("down" as const) : ("flat" as const),
  };
}

export function DashboardPage() {
  const { activeStore } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const currency = activeStore?.currency ?? "EUR";

  const state = useAsync<DashboardData>(
    (signal) =>
      api.get<DashboardData>(`/dashboard?${buildQuery({ period })}`, signal),
    `${activeStore?.id ?? "none"}:${period}`,
  );

  if (state.loading) return <LoadingState label="Cargando panel…" />;
  if (state.error)
    return <ErrorState description="No hemos podido cargar el panel." onRetry={state.refetch} />;
  const data = state.data;
  if (!data) return <EmptyState title="Sin datos" />;

  const chartData = data.series.map((point) => ({
    ...point,
    label: point.bucket,
    salesEur: point.sales / 100,
    expensesEur: point.expenses / 100,
    profitEur: point.profit / 100,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Panel</h1>
          <p className="text-sm text-neutral-500">
            {activeStore?.name ?? "tu tienda"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/sales/new">
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" /> Nueva venta
            </Button>
          </Link>
          <Link to="/expenses/new">
            <Button variant="outline">
              <Receipt className="h-4 w-4" aria-hidden="true" /> Añadir gasto
            </Button>
          </Link>
          <Link to="/products/new">
            <Button variant="outline">
              <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo producto
            </Button>
          </Link>
        </div>
      </div>

      <Tabs
        items={periods.map((item) => ({ value: item.value, label: item.label, content: null }))}
        value={period}
        onChange={(value) => setPeriod(value as Period)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ventas"
          value={formatCurrency(data.kpis.sales, currency)}
          icon={<TrendingUp className="h-5 w-5" />}
          delta={deltaProps(data.kpis.delta.sales)}
        />
        <StatCard
          label="Gastos"
          value={formatCurrency(data.kpis.expenses, currency)}
          icon={<TrendingDown className="h-5 w-5" />}
          delta={
            data.kpis.delta.expenses === null
              ? undefined
              : {
                  value: `${data.kpis.delta.expenses >= 0 ? "+" : ""}${data.kpis.delta.expenses.toFixed(1)}%`,
                  direction: data.kpis.delta.expenses > 0 ? "up" : data.kpis.delta.expenses < 0 ? "down" : "flat",
                  positiveIsGood: false,
                }
          }
        />
        <StatCard
          label="Beneficio"
          value={formatCurrency(data.kpis.profit, currency)}
          icon={<Banknote className="h-5 w-5" />}
          delta={deltaProps(data.kpis.delta.profit)}
        />
        <StatCard
          label="Dinero en caja"
          value={formatCurrency(data.kpis.cash, currency)}
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader title="Ventas y gastos" />
        <CardContent>
          {chartData.length === 0 ? (
            <EmptyState title="Sin movimientos en este periodo" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={56} />
                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(Math.round(Number(value ?? 0) * 100), currency)
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="salesEur"
                    name="Ventas"
                    stroke="#3366ff"
                    fill="#3366ff"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="expensesEur"
                    name="Gastos"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="profitEur"
                    name="Beneficio"
                    stroke="#16a34a"
                    fill="#16a34a"
                    fillOpacity={0.05}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ventas recientes" />
          {data.recentSales.length === 0 ? (
            <EmptyState title="No hay ventas todavía" />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Total</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.recentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{sale.customerName ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(sale.total, currency)}</TableCell>
                    <TableCell>
                      <Badge tone={sale.status === "completed" ? "success" : "danger"}>
                        {sale.status === "completed" ? "Completada" : "Cancelada"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Productos más vendidos" />
          {data.topProducts.length === 0 ? (
            <EmptyState title="Sin productos vendidos" />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Producto</TableHeaderCell>
                  <TableHeaderCell>Uds.</TableHeaderCell>
                  <TableHeaderCell>Ingresos</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.topProducts.map((product, index) => (
                  <TableRow key={product.productId ?? index}>
                    <TableCell>{product.name ?? "—"}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>{formatCurrency(product.revenue, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
