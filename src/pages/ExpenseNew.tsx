import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import {
  ExpenseForm,
  type ExpenseFormProps,
} from "@/components/expenses/ExpenseForm";

export function ExpenseNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const categoriesState = useAsync<{ id: string; name: string }[]>(
    (signal) => api.get(`/categories?type=expense`, signal),
    "expense-categories-new",
  );

  const onSubmit: ExpenseFormProps["onSubmit"] = async (values) => {
    setSubmitting(true);
    try {
      await api.post("/expenses", { ...values, categoryId: values.categoryId || null });
      toast.success("Gasto creado correctamente");
      navigate("/expenses");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo guardar el gasto");
    } finally {
      setSubmitting(false);
    }
  };

  if (categoriesState.loading) return <LoadingState label="Cargando…" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nuevo gasto</h1>
      <Card>
        <CardContent>
          <ExpenseForm
            defaultValues={{
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
            }}
            categories={(categoriesState.data ?? []).map((category) => ({
              value: category.id,
              label: category.name,
            }))}
            submitting={submitting}
            onSubmit={onSubmit}
            onCancel={() => navigate("/expenses")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
