import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/date";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
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

interface CustomerDetailResponse {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    createdAt: string;
  };
  history: {
    id: string;
    total: number;
    status: "completed" | "cancelled";
    saleDate: string;
    paymentMethod: string | null;
  }[];
}

export function CustomerDetailPage() {
  const { id = "" } = useParams();
  const { activeStore } = useAuth();
  const navigate = useNavigate();

  const state = useAsync<CustomerDetailResponse>(
    (signal) => api.get(`/customers/${id}`, signal),
    `customer:${id}:${activeStore?.id ?? "none"}`,
  );

  const currency = activeStore?.currency ?? "EUR";
  const timezone = activeStore?.timezone ?? "Europe/Madrid";

  if (state.loading) return <LoadingState />;
  if (state.error)
    return <ErrorState description="No hemos podido cargar el cliente." onRetry={state.refetch} />;
  if (!state.data) return <EmptyState title="Cliente no encontrado" />;

  const { customer, history } = state.data;
  const completed = history.filter((sale) => sale.status === "completed");
  const totalSpent = completed.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/customers")} aria-label="Volver">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
          <p className="text-sm text-neutral-500">
            {customer.email ?? "Sin email"} · {customer.phone ?? "Sin teléfono"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-neutral-500">Compras</p>
          <p className="mt-1 text-2xl font-semibold">{completed.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-neutral-500">Total gastado</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalSpent, currency)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-neutral-500">Cliente desde</p>
          <p className="mt-1 text-2xl font-semibold">{formatDate(customer.createdAt, timezone)}</p>
        </Card>
      </div>

      {customer.notes ? (
        <Card>
          <CardHeader title="Notas" />
          <CardContent>
            <p className="text-sm text-neutral-700">{customer.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Historial de compras" />
        {history.length === 0 ? (
          <EmptyState title="Sin compras registradas" />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Fecha</TableHeaderCell>
                <TableHeaderCell>Método</TableHeaderCell>
                <TableHeaderCell>Total</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{formatDateTime(sale.saleDate, timezone)}</TableCell>
                  <TableCell>{sale.paymentMethod ?? "—"}</TableCell>
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
    </div>
  );
}
