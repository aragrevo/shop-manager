import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import {
  ProductForm,
  type ProductFormProps,
} from "@/components/products/ProductForm";

export function ProductNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const categoriesState = useAsync<{ id: string; name: string }[]>(
    (signal) => api.get(`/categories?type=product`, signal),
    "product-categories-new",
  );

  const onSubmit: ProductFormProps["onSubmit"] = async (values) => {
    setSubmitting(true);
    try {
      await api.post("/products", { ...values, categoryId: values.categoryId || null });
      toast.success("Producto creado");
      navigate("/products");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo guardar el producto");
    } finally {
      setSubmitting(false);
    }
  };

  if (categoriesState.loading) return <LoadingState label="Cargando…" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nuevo producto</h1>
      <Card>
        <CardContent>
          <ProductForm
            defaultValues={{
              name: "",
              sku: "",
              categoryId: "",
              description: "",
              imageUrl: "",
              salePrice: "",
              costPrice: "",
              stock: 0,
              minimumStock: 0,
              active: true,
            }}
            categories={(categoriesState.data ?? []).map((category) => ({
              value: category.id,
              label: category.name,
            }))}
            submitting={submitting}
            onSubmit={onSubmit}
            onCancel={() => navigate("/products")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
