import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { customerInputSchema } from "@/schemas/customer";
import { api, ApiError, buildQuery } from "@/lib/api";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  purchaseCount: number;
  totalSpent: number;
  lastPurchaseAt: string | null;
}

interface CustomersResponse {
  rows: CustomerRow[];
  total: number;
}

interface CustomerFormValues {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export function CustomersPage() {
  const { activeStore } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const currency = activeStore?.currency ?? "EUR";
  const timezone = activeStore?.timezone ?? "Europe/Madrid";

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    defaultValues: { name: "", email: "", phone: "", notes: "" },
  });

  const list = useAsync<CustomersResponse>(
    (signal) =>
      api.get<CustomersResponse>(
        `/customers?${buildQuery({ search, page, pageSize: 10 })}`,
        signal,
      ),
    `${activeStore?.id ?? "none"}:${search}:${page}`,
  );

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", email: "", phone: "", notes: "" });
    setDrawerOpen(true);
  };

  const openEdit = (row: CustomerRow) => {
    setEditing(row);
    reset({ name: row.name, email: row.email ?? "", phone: row.phone ?? "", notes: "" });
    setDrawerOpen(true);
  };

  const submitForm = handleSubmit(async (values) => {
    const parsed = customerInputSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          setError(field as keyof CustomerFormValues, { message: issue.message });
        }
      }
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await api.patch(`/customers/${editing.id}`, values);
        toast.success("Cliente actualizado");
      } else {
        await api.post("/customers", values);
        toast.success("Cliente creado");
      }
      setDrawerOpen(false);
      list.refetch();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo guardar el cliente");
    } finally {
      setSubmitting(false);
    }
  });

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.del(`/customers/${deleteId}`);
      toast.success("Cliente eliminado");
      setDeleteId(null);
      list.refetch();
    } catch {
      toast.error("No se pudo eliminar el cliente");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-neutral-500">Fichas e historial de compras</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo cliente
        </Button>
      </div>

      <Input
        label="Buscar"
        placeholder="Nombre o email"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />

      <div className="rounded-lg border border-neutral-200 bg-white">
        {list.loading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState description="No hemos podido cargar los clientes." onRetry={list.refetch} />
        ) : !list.data || list.data.rows.length === 0 ? (
          <EmptyState
            title="No hay clientes"
            description="Añade tu primer cliente para verlo aquí."
            action={<Button onClick={openCreate}>Nuevo cliente</Button>}
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Contacto</TableHeaderCell>
                  <TableHeaderCell>Compras</TableHeaderCell>
                  <TableHeaderCell>Total gastado</TableHeaderCell>
                  <TableHeaderCell>Última compra</TableHeaderCell>
                  <TableHeaderCell aria-label="Acciones" />
                </TableRow>
              </TableHead>
              <TableBody>
                {list.data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        to={`/customers/${row.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="block">{row.email ?? "—"}</span>
                      <span className="block text-xs text-neutral-500">{row.phone ?? ""}</span>
                    </TableCell>
                    <TableCell>{row.purchaseCount}</TableCell>
                    <TableCell>{formatCurrency(row.totalSpent, currency)}</TableCell>
                    <TableCell>
                      {row.lastPurchaseAt ? formatDate(row.lastPurchaseAt, timezone) : "—"}
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
        title={editing ? "Editar cliente" : "Nuevo cliente"}
      >
        <form onSubmit={submitForm} className="flex flex-col gap-4" noValidate>
          <Input label="Nombre" required error={errors.name?.message} {...register("name")} />
          <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
          <Input label="Teléfono" error={errors.phone?.message} {...register("phone")} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer-notes" className="text-sm font-medium text-neutral-700">
              Notas
            </label>
            <textarea
              id="customer-notes"
              rows={3}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              {...register("notes")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editing ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar cliente"
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
