import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";

interface StoreSettings {
  id: string;
  name: string;
  taxId: string | null;
  currency: string;
  timezone: string;
}

interface SettingsResponse {
  store: StoreSettings;
  members: { id: string; name: string; email: string; role: "owner" | "admin" | "employee" }[];
}

const currencies = [
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — Dólar" },
  { value: "GBP", label: "GBP — Libra" },
  { value: "MXN", label: "MXN — Peso mexicano" },
];

const timezones = [
  { value: "Europe/Madrid", label: "Europe/Madrid" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "America/Mexico_City", label: "America/Mexico_City" },
  { value: "UTC", label: "UTC" },
];

const roleLabel = { owner: "Propietario", admin: "Administrador", employee: "Empleado" } as const;

export function SettingsPage() {
  const { activeStore, refresh } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", taxId: "", currency: "EUR", timezone: "Europe/Madrid" });

  const state = useAsync<SettingsResponse>(
    (signal) =>
      api.get(`/stores/${activeStore?.id}?members=true`, signal),
    `settings:${activeStore?.id ?? "none"}`,
  );

  useEffect(() => {
    if (state.data) {
      setForm({
        name: state.data.store.name,
        taxId: state.data.store.taxId ?? "",
        currency: state.data.store.currency,
        timezone: state.data.store.timezone,
      });
    }
  }, [state.data]);

  const canEdit = activeStore?.role === "owner" || activeStore?.role === "admin";

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/stores/${activeStore?.id}`, {
        name: form.name,
        taxId: form.taxId || null,
        currency: form.currency,
        timezone: form.timezone,
      });
      await refresh();
      toast.success("Ajustes guardados");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudieron guardar los ajustes");
    } finally {
      setSubmitting(false);
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error)
    return <ErrorState description="No hemos podido cargar los ajustes." onRetry={state.refetch} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-sm text-neutral-500">Configuración de la tienda</p>
      </div>

      <Card>
        <CardHeader title="Datos de la tienda" />
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              value={form.name}
              disabled={!canEdit}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              label="CIF / NIF"
              value={form.taxId}
              disabled={!canEdit}
              onChange={(event) => setForm((prev) => ({ ...prev, taxId: event.target.value }))}
            />
            <Select
              label="Moneda"
              options={currencies}
              value={form.currency}
              disabled={!canEdit}
              onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
            />
            <Select
              label="Zona horaria"
              options={timezones}
              value={form.timezone}
              disabled={!canEdit}
              onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
            />
            {canEdit ? (
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" isLoading={submitting}>
                  Guardar cambios
                </Button>
              </div>
            ) : (
              <p className="sm:col-span-2 text-sm text-neutral-500">
                Solo propietarios y administradores pueden editar la tienda.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Miembros" />
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Nombre</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Rol</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(state.data?.members ?? []).map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Badge tone={member.role === "owner" ? "info" : "neutral"}>
                    {roleLabel[member.role]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
