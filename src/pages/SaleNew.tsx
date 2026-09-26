import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { manualSaleInputSchema } from "@/schemas/sale";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, parseMoney } from "@/lib/money";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

interface SaleFormValues {
  total: string;
  taxAmount: string;
  paymentMethod: string;
  saleDate: string;
  notes: string;
}

export function SaleNewPage() {
  const { activeStore } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<SaleFormValues>({
    defaultValues: {
      total: "",
      taxAmount: "0",
      paymentMethod: "Efectivo",
      saleDate: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const currency = activeStore?.currency ?? "EUR";
  const totalCents = parseMoney(watch("total")) ?? 0;
  const taxCents = parseMoney(watch("taxAmount")) ?? 0;

  const onSubmit = handleSubmit((values) => {
    const parsed = manualSaleInputSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          setError(field as keyof SaleFormValues, { message: issue.message });
        }
      }
      return;
    }

    setSubmitting(true);
    api
      .post("/sales", {
        total: values.total,
        taxAmount: values.taxAmount || "0",
        paymentMethod: values.paymentMethod || undefined,
        saleDate: values.saleDate || undefined,
        notes: values.notes || undefined,
      })
      .then(() => {
        toast.success("Venta registrada");
        navigate("/sales");
      })
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "No se pudo guardar la venta");
      })
      .finally(() => setSubmitting(false));
  });

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-xl flex-col gap-6" noValidate>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nueva venta</h1>
          <p className="text-sm text-neutral-500">Registra el importe vendido del día</p>
        </div>
        <div className="flex gap-2">
          <Link to="/sales">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" isLoading={submitting}>
            Guardar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader title="Datos de la venta" />
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Importe vendido (€)"
            inputMode="decimal"
            required
            placeholder="0,00"
            error={errors.total?.message}
            {...register("total")}
          />
          <Input
            label="IVA incluido (€)"
            inputMode="decimal"
            error={errors.taxAmount?.message}
            {...register("taxAmount")}
          />
          <DatePicker label="Fecha" required {...register("saleDate")} />
          <Select
            label="Método de pago"
            options={[
              { value: "Efectivo", label: "Efectivo" },
              { value: "Tarjeta", label: "Tarjeta" },
              { value: "Bizum", label: "Bizum" },
              { value: "Transferencia", label: "Transferencia" },
            ]}
            {...register("paymentMethod")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Notas" />
        <CardContent>
          <textarea
            rows={3}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            placeholder="Notas internas (opcional)"
            {...register("notes")}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col items-end gap-1 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex w-full max-w-xs justify-between text-sm">
          <span className="text-neutral-500">Importe</span>
          <span className="font-medium">{formatCurrency(totalCents, currency)}</span>
        </div>
        <div className="flex w-full max-w-xs justify-between text-sm">
          <span className="text-neutral-500">IVA incluido</span>
          <span className="font-medium">{formatCurrency(taxCents, currency)}</span>
        </div>
        <div className="flex w-full max-w-xs justify-between text-base">
          <span className="font-semibold">Total</span>
          <span className="font-semibold">{formatCurrency(totalCents, currency)}</span>
        </div>
      </div>
    </form>
  );
}
