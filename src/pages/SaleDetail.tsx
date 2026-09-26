import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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

interface SaleDetail {
  id: string;
  total: number;
  taxAmount: number;
  status: "completed" | "cancelled";
  paymentMethod: string | null;
  saleDate: string;
  notes: string | null;
  items: {
    id: string;
    productName: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

export function SaleDetailPage() {
  const { id = "" } = useParams();
  const { activeStore } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const state = useAsync<SaleDetail>(
    (signal) => api.get<SaleDetail>(`/sales/${id}`, signal),
    `sale:${id}:${activeStore?.id ?? "none"}`,
  );

  const currency = activeStore?.currency ?? "EUR";
  const timezone = activeStore?.timezone ?? "Europe/Madrid";

  const onCancel = async () => {
    setCancelling(true);
    try {
      await api.patch(`/sales/${id}`);
      toast.success("Venta cancelada");
      setConfirming(false);
      state.refetch();
    } catch {
      toast.error("No se pudo cancelar la venta");
    } finally {
      setCancelling(false);
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error)
    return <ErrorState description="No hemos podido cargar la venta." onRetry={state.refetch} />;
  const sale = state.data;
  if (!sale) return <EmptyState title="Venta no encontrada" />;

  const subtotal = sale.items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales")} aria-label="Volver">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Venta</h1>
            <p className="text-sm text-neutral-500">
              {formatDateTime(sale.saleDate, timezone)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={sale.status === "completed" ? "success" : "danger"}>
            {sale.status === "completed" ? "Completada" : "Cancelada"}
          </Badge>
          {sale.status === "completed" ? (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Cancelar venta
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader title="Productos" />
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Producto</TableHeaderCell>
              <TableHeaderCell>Cantidad</TableHeaderCell>
              <TableHeaderCell>Precio</TableHeaderCell>
              <TableHeaderCell>Subtotal</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sale.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.productName ?? "Producto eliminado"}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.unitPrice, currency)}</TableCell>
                <TableCell>{formatCurrency(item.subtotal, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <CardContent className="flex flex-col items-end gap-1">
          <div className="flex w-full max-w-xs justify-between text-sm">
            <span className="text-neutral-500">Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex w-full max-w-xs justify-between text-sm">
            <span className="text-neutral-500">Impuestos</span>
            <span>{formatCurrency(sale.taxAmount, currency)}</span>
          </div>
          <div className="flex w-full max-w-xs justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(sale.total, currency)}</span>
          </div>
        </CardContent>
      </Card>

      {sale.notes ? (
        <Card>
          <CardHeader title="Notas" />
          <CardContent>
            <p className="text-sm text-neutral-700">{sale.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-neutral-500">
        Método de pago: {sale.paymentMethod ?? "—"} ·{" "}
        <Link to="/sales" className="text-brand-700 hover:underline">
          Volver a ventas
        </Link>
      </p>

      <ConfirmDialog
        open={confirming}
        title="Cancelar venta"
        description="Se restaurará el stock de los productos. No se puede deshacer."
        confirmLabel="Cancelar venta"
        tone="danger"
        isLoading={cancelling}
        onConfirm={onCancel}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
