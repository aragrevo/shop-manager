import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/money";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  salePrice: number;
  stock: number;
}
interface CustomerRow {
  id: string;
  name: string;
}

interface LineItem {
  productId: string;
  quantity: number;
}

interface SaleForm {
  customerId: string;
  paymentMethod: string;
  taxAmount: string;
  saleDate: string;
  notes: string;
  items: LineItem[];
}

const paymentOptions = [
  { value: "Efectivo", label: "Efectivo" },
  { value: "Tarjeta", label: "Tarjeta" },
  { value: "Bizum", label: "Bizum" },
];

export function SaleNewPage() {
  const { activeStore } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const productsState = useAsync<{ rows: ProductRow[] }>(
    (signal) => api.get(`/products?pageSize=100&active=true`, signal),
    "sale-new-products",
  );
  const customersState = useAsync<{ rows: CustomerRow[] }>(
    (signal) => api.get(`/customers?pageSize=100`, signal),
    "sale-new-customers",
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<SaleForm>({
    defaultValues: {
      customerId: "",
      paymentMethod: "Efectivo",
      taxAmount: "0",
      saleDate: new Date().toISOString().slice(0, 10),
      notes: "",
      items: [{ productId: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const products = productsState.data?.rows ?? [];

  const productById = new Map(products.map((p) => [p.id, p]));
  const subtotal = watchedItems.reduce((sum, item) => {
    const product = productById.get(item.productId);
    return sum + (product ? product.salePrice * (Number(item.quantity) || 0) : 0);
  }, 0);
  const taxCents = Math.round((Number(watch("taxAmount").replace(",", ".")) || 0) * 100);
  const total = subtotal + (Number.isFinite(taxCents) ? taxCents : 0);
  const currency = activeStore?.currency ?? "EUR";

  const onSubmit = handleSubmit(async (values) => {
    const items = values.items.filter((item) => item.productId);
    if (items.length === 0) {
      setError("items", { message: "Añade al menos un producto" });
      return;
    }
    setSubmitting(true);
    try {
      await api.post<{ saleId: string }>("/sales", {
        customerId: values.customerId || null,
        paymentMethod: values.paymentMethod || undefined,
        taxAmount: values.taxAmount || "0",
        saleDate: values.saleDate || undefined,
        notes: values.notes || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
      });
      toast.success("Venta creada correctamente");
      navigate("/sales");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(error.message);
      } else if (error instanceof ApiError && error.status === 400) {
        for (const issue of error.issues) {
          toast.error(issue.message);
        }
      } else {
        toast.error("No se pudo guardar la venta");
      }
    } finally {
      setSubmitting(false);
    }
  });

  if (productsState.loading || customersState.loading) {
    return <LoadingState label="Cargando datos…" />;
  }
  if (productsState.error || customersState.error) {
    return (
      <ErrorState
        description="No hemos podido cargar productos o clientes."
        onRetry={() => {
          productsState.refetch();
          customersState.refetch();
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Nueva venta</h1>
        <div className="flex gap-2">
          <Link to="/sales">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" isLoading={submitting}>
            Guardar venta
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader title="Datos de la venta" />
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Cliente"
            placeholder="Sin cliente"
            options={(customersState.data?.rows ?? []).map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            {...register("customerId")}
          />
          <Select
            label="Método de pago"
            options={paymentOptions}
            {...register("paymentMethod")}
          />
          <DatePicker label="Fecha" {...register("saleDate")} />
          <Input
            label="Impuestos (€)"
            inputMode="decimal"
            error={errors.taxAmount?.message}
            {...register("taxAmount")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Productos"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productId: "", quantity: 1 })}
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Añadir línea
            </Button>
          }
        />
        <CardContent className="flex flex-col gap-4">
          {errors.items?.message ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {errors.items.message}
            </p>
          ) : null}
          {fields.map((field, index) => {
            const selected = productById.get(watchedItems[index]?.productId ?? "");
            const quantity = Number(watchedItems[index]?.quantity) || 0;
            return (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-3 rounded-md border border-neutral-200 p-3 sm:grid-cols-[1fr_120px_140px_auto]"
              >
                <Select
                  label={`Producto ${index + 1}`}
                  placeholder="Selecciona…"
                  options={products.map((p) => ({
                    value: p.id,
                    label: `${p.name}${p.sku ? ` (${p.sku})` : ""} · ${formatCurrency(p.salePrice, currency)} · stock ${p.stock}`,
                  }))}
                  {...register(`items.${index}.productId` as const)}
                />
                <Input
                  label="Cantidad"
                  type="number"
                  min={1}
                  max={selected?.stock ?? undefined}
                  {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                />
                <div className="flex flex-col justify-end">
                  <span className="text-xs text-neutral-500">Subtotal</span>
                  <span className="text-sm font-medium">
                    {selected ? formatCurrency(selected.salePrice * quantity, currency) : "—"}
                  </span>
                  {selected && quantity > selected.stock ? (
                    <span className="text-xs text-red-600">Stock insuficiente ({selected.stock})</span>
                  ) : null}
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    aria-label={`Quitar línea ${index + 1}`}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
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
          <span className="text-neutral-500">Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
        </div>
        <div className="flex w-full max-w-xs justify-between text-sm">
          <span className="text-neutral-500">Impuestos</span>
          <span className="font-medium">
            {formatCurrency(Number.isFinite(taxCents) ? taxCents : 0, currency)}
          </span>
        </div>
        <div className="flex w-full max-w-xs justify-between text-base">
          <span className="font-semibold">Total</span>
          <span className="font-semibold">{formatCurrency(total, currency)}</span>
        </div>
        <p className="text-xs text-neutral-400">
          Los precios y costes se calculan con los datos del producto en el servidor.
        </p>
      </div>
    </form>
  );
}
