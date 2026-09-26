import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { api, ApiError, buildQuery } from "@/lib/api";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Drawer } from "@/components/ui/Drawer";
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
import {
  ExpenseForm,
  type ExpenseFormValues,
} from "@/components/expenses/ExpenseForm";

interface ExpenseRow {
  id: string;
  description: string;
  supplier: string | null;
  amount: number;
  taxAmount: number;
  status: "pending" | "paid" | "cancelled";
  paymentMethod: string | null;
  expenseDate: string;
  categoryId: string | null;
  categoryName: string | null;
}

interface ExpensesResponse {
  rows: ExpenseRow[];
  total: number;
}

const statusTone = {
  paid: "success",
  pending: "warning",
  cancelled: "danger",
} as const;
const statusLabel = { paid: "Pagado", pending: "Pendiente", cancelled: "Cancelado" } as const;

const emptyValues = (): ExpenseFormValues => ({
  description: "",
  categoryId: "",
  supplier: "",
  amount: "",
  taxAmount: "0",
  paymentMethod: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  status: "paid",
  notes: "",
  receiptUrl: "",
});

export function ExpensesPage() {
  const { activeStore } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [formValues, setFormValues] = useState<ExpenseFormValues>(emptyValues());
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const currency = activeStore?.currency ?? "EUR";
  const timezone = activeStore?.timezone ?? "Europe/Madrid";

  const list = useAsync<ExpensesResponse>(
    (signal) =>
      api.get<ExpensesResponse>(
        `/expenses?${buildQuery({ status, search, page, pageSize: 10 })}`,
        signal,
      ),
    `${activeStore?.id ?? "none"}:${status}:${search}:${page}`,
  );
  const categoriesState = useAsync<{ id: string; name: string }[]>(
    (signal) => api.get(`/categories?type=expense`, signal),
    "expense-categories",
  );

  const categoryOptions = (categoriesState.data ?? []).map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const openCreate = () => {
    setEditing(null);
    setFormValues(emptyValues());
    setDrawerOpen(true);
  };

  const openEdit = (row: ExpenseRow) => {
    setEditing(row);
    setFormValues({
      description: row.description,
      categoryId: row.categoryId ?? "",
      supplier: row.supplier ?? "",
      amount: (row.amount / 100).toFixed(2).replace(".", ","),
      taxAmount: (row.taxAmount / 100).toFixed(2).replace(".", ","),
      paymentMethod: row.paymentMethod ?? "",
      expenseDate: row.expenseDate.slice(0, 10),
      status: row.status,
      notes: "",
      receiptUrl: "",
    });
    setDrawerOpen(true);
  };

  const submitForm = async (values: ExpenseFormValues) => {
    setSubmitting(true);
    try {
      const payload = { ...values, categoryId: values.categoryId || null };
      if (editing) {
        await api.patch(`/expenses/${editing.id}`, payload);
        toast.success("Gasto actualizado");
      } else {
        await api.post("/expenses", payload);
        toast.success("Gasto creado correctamente");
      }
      setDrawerOpen(false);
      list.refetch();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "No se pudo guardar el gasto";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.del(`/expenses/${deleteId}`);
      toast.success("Gasto eliminado");
      setDeleteId(null);
      list.refetch();
    } catch {
      toast.error("No se pudo eliminar el gasto");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
          <p className="text-sm text-neutral-500">Control de gastos y proveedores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Añadir gasto
          </Button>
          <Link to="/expenses/new">
            <Button>Nuevo (página)</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Buscar"
          placeholder="Concepto o proveedor"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Estado"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "Todos" },
            { value: "paid", label: "Pagado" },
            { value: "pending", label: "Pendiente" },
            { value: "cancelled", label: "Cancelado" },
          ]}
        />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        {list.loading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState description="No hemos podido cargar los gastos." onRetry={list.refetch} />
        ) : !list.data || list.data.rows.length === 0 ? (
          <EmptyState
            title="No hay gastos todavía"
            description="Añade tu primer gasto para verlo aquí."
            action={<Button onClick={openCreate}>Añadir gasto</Button>}
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Concepto</TableHeaderCell>
                  <TableHeaderCell>Categoría</TableHeaderCell>
                  <TableHeaderCell>Importe</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell aria-label="Acciones" />
                </TableRow>
              </TableHead>
              <TableBody>
                {list.data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.expenseDate, timezone)}</TableCell>
                    <TableCell>
                      <span className="font-medium text-neutral-900">{row.description}</span>
                      {row.supplier ? (
                        <span className="block text-xs text-neutral-500">{row.supplier}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.categoryName ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(row.amount, currency)}</TableCell>
                    <TableCell>
                      <Badge tone={statusTone[row.status]}>{statusLabel[row.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Dropdown
                        items={[
                          { label: "Editar", onSelect: () => openEdit(row) },
                          {
                            label: "Eliminar",
                            tone: "danger",
                            onSelect: () => setDeleteId(row.id),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={10} total={list.data.total} onPageChange={setPage} />
          </>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Editar gasto" : "Nuevo gasto"}
      >
        <ExpenseForm
          defaultValues={formValues}
          categories={categoryOptions}
          submitting={submitting}
          submitLabel={editing ? "Guardar cambios" : "Crear gasto"}
          onSubmit={submitForm}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar gasto"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        tone="danger"
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
