import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { api, buildQuery } from "@/lib/api";
import { formatCurrency } from "@/lib/money";
import { formatDateTime } from "@/lib/date";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dropdown } from "@/components/ui/Dropdown";
import { useToast } from "@/components/ui/Toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";

interface SaleRow {
  id: string;
  total: number;
  status: "completed" | "cancelled";
  paymentMethod: string | null;
  saleDate: string;
  customerName: string | null;
}

interface SalesResponse {
  rows: SaleRow[];
  total: number;
}

const statusOptions = [
  { value: "", label: "Todas" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
];

export function SalesPage() {
  const { activeStore } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const key = `${activeStore?.id ?? "none"}:${status}:${page}`;
  const state = useAsync<SalesResponse>(
    (signal) =>
      api.get<SalesResponse>(
        `/sales?${buildQuery({ status, page, pageSize: 10 })}`,
        signal,
      ),
    key,
  );

  const confirmCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await api.patch(`/sales/${cancelId}`);
      toast.success("Venta cancelada");
      state.refetch();
    } catch {
      toast.error("No se pudo cancelar la venta");
    } finally {
      setCancelling(false);
      setCancelId(null);
    }
  };

  const timezone = activeStore?.timezone ?? "Europe/Madrid";
  const currency = activeStore?.currency ?? "EUR";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
          <p className="text-sm text-neutral-500">Historial y registro de ventas</p>
        </div>
        <Link to="/sales/new">
          <Button>
            <Plus className="h-4 w-4" aria-hidden="true" /> Nueva venta
          </Button>
        </Link>
      </div>

      <div className="max-w-xs">
        <Select
          label="Estado"
          options={statusOptions}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        {state.loading ? (
          <LoadingState />
        ) : state.error ? (
          <ErrorState description="No hemos podido cargar las ventas." onRetry={state.refetch} />
        ) : !state.data || state.data.rows.length === 0 ? (
          <EmptyState
            title="No hay ventas todavía"
            description="Registra tu primera venta para verla aquí."
            action={
              <Link to="/sales/new">
                <Button>Nueva venta</Button>
              </Link>
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Método</TableHeaderCell>
                  <TableHeaderCell>Total</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell aria-label="Acciones" />
                </TableRow>
              </TableHead>
              <TableBody>
                {state.data.rows.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{formatDateTime(sale.saleDate, timezone)}</TableCell>
                    <TableCell>{sale.customerName ?? "—"}</TableCell>
                    <TableCell>{sale.paymentMethod ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(sale.total, currency)}</TableCell>
                    <TableCell>
                      <Badge tone={sale.status === "completed" ? "success" : "danger"}>
                        {sale.status === "completed" ? "Completada" : "Cancelada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dropdown
                        items={[
                          {
                            label: "Ver detalle",
                            onSelect: () => navigate(`/sales/${sale.id}`),
                          },
                          {
                            label: "Cancelar venta",
                            tone: "danger",
                            disabled: sale.status === "cancelled",
                            onSelect: () => setCancelId(sale.id),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              pageSize={10}
              total={state.data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={cancelId !== null}
        title="Cancelar venta"
        description="Se restaurará el stock de los productos. Esta acción no se puede deshacer."
        confirmLabel="Cancelar venta"
        cancelLabel="Volver"
        tone="danger"
        isLoading={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
}
