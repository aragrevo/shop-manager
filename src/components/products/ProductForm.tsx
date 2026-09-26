import { useForm } from "react-hook-form";
import { productInputSchema } from "@/schemas/product";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export interface ProductFormValues {
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  imageUrl: string;
  salePrice: string;
  costPrice: string;
  stock: number;
  minimumStock: number;
  active: boolean;
}

export interface ProductFormProps {
  defaultValues: ProductFormValues;
  categories: { value: string; label: string }[];
  submitting: boolean;
  submitLabel?: string;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
}

export function ProductForm({
  defaultValues,
  categories,
  submitting,
  submitLabel = "Guardar producto",
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProductFormValues>({ defaultValues });

  const submit = handleSubmit((values) => {
    const parsed = productInputSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          setError(field as keyof ProductFormValues, { message: issue.message });
        }
      }
      return;
    }
    onSubmit(values);
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Nombre"
        required
        error={errors.name?.message}
        {...register("name")}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="SKU" error={errors.sku?.message} {...register("sku")} />
        <Select
          label="Categoría"
          placeholder="Sin categoría"
          options={categories}
          {...register("categoryId")}
        />
        <Input
          label="Precio de venta (€)"
          inputMode="decimal"
          required
          error={errors.salePrice?.message}
          {...register("salePrice")}
        />
        <Input
          label="Coste (€)"
          inputMode="decimal"
          required
          error={errors.costPrice?.message}
          {...register("costPrice")}
        />
        <Input
          label="Stock"
          type="number"
          min={0}
          required
          error={errors.stock?.message}
          {...register("stock", { valueAsNumber: true })}
        />
        <Input
          label="Stock mínimo"
          type="number"
          min={0}
          required
          error={errors.minimumStock?.message}
          {...register("minimumStock", { valueAsNumber: true })}
        />
        <Input label="Imagen (URL)" {...register("imageUrl")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="product-description" className="text-sm font-medium text-neutral-700">
          Descripción
        </label>
        <textarea
          id="product-description"
          rows={3}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          {...register("description")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" className="h-4 w-4" {...register("active")} />
        Producto activo
      </label>
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
