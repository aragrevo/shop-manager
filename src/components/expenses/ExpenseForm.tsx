import { useForm } from "react-hook-form";
import { expenseInputSchema } from "@/schemas/expense";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";

export interface ExpenseFormValues {
  description: string;
  categoryId: string;
  supplier: string;
  amount: string;
  taxAmount: string;
  paymentMethod: string;
  expenseDate: string;
  status: "pending" | "paid" | "cancelled";
  notes: string;
  receiptUrl: string;
}

export interface ExpenseFormProps {
  defaultValues: ExpenseFormValues;
  categories: { value: string; label: string }[];
  submitting: boolean;
  submitLabel?: string;
  onSubmit: (values: ExpenseFormValues) => void;
  onCancel: () => void;
}

export function ExpenseForm({
  defaultValues,
  categories,
  submitting,
  submitLabel = "Guardar gasto",
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ExpenseFormValues>({ defaultValues });

  const submit = handleSubmit((values) => {
    const parsed = expenseInputSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          setError(field as keyof ExpenseFormValues, { message: issue.message });
        }
      }
      return;
    }
    onSubmit(values);
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Concepto"
        required
        error={errors.description?.message}
        {...register("description")}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Categoría"
          placeholder="Sin categoría"
          options={categories}
          {...register("categoryId")}
        />
        <Input label="Proveedor" {...register("supplier")} />
        <Input
          label="Importe (€)"
          inputMode="decimal"
          required
          error={errors.amount?.message}
          {...register("amount")}
        />
        <Input label="IVA (€)" inputMode="decimal" {...register("taxAmount")} />
        <DatePicker label="Fecha" required {...register("expenseDate")} />
        <Select
          label="Método de pago"
          placeholder="Sin especificar"
          options={[
            { value: "Efectivo", label: "Efectivo" },
            { value: "Tarjeta", label: "Tarjeta" },
            { value: "Transferencia", label: "Transferencia" },
          ]}
          {...register("paymentMethod")}
        />
        <Select
          label="Estado"
          options={[
            { value: "paid", label: "Pagado" },
            { value: "pending", label: "Pendiente" },
            { value: "cancelled", label: "Cancelado" },
          ]}
          {...register("status")}
        />
        <Input label="Recibo (URL)" {...register("receiptUrl")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="expense-notes" className="text-sm font-medium text-neutral-700">
          Notas
        </label>
        <textarea
          id="expense-notes"
          rows={3}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          {...register("notes")}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
