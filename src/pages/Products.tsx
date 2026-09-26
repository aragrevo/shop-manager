import { useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Plus, PackageX, TriangleAlert } from "lucide-react";
import { api, ApiError, buildQuery } from "@/lib/api";
import { formatCurrency } from "@/lib/money";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { StatCard } from "@/components/ui/StatCard";
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
  ProductForm,
  type ProductFormValues,
} from "@/components/products/ProductForm";

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  salePrice: number;
  costPrice: number;
  stock: number;
  minimumStock: number;
  active: boolean;
}

interface ProductsResponse {
  rows: ProductRow[];
  total: number;
}

interface InventoryStats {
  productCount: number;
  totalUnits: number;
  inventoryCostValue: number;
  inventorySaleValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

const emptyValues = (): ProductFormValues => ({
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
});

export function ProductsPage() {
  const { activeStore } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [formValues, setFormValues] = useState<ProductFormValues>(emptyValues());
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const currency = activeStore?.currency ?? "EUR";

  const list = useAsync<ProductsResponse>(
    (signal) =>
      api.get<ProductsResponse>(
        `/products?${buildQuery({ search, lowStock: lowStock ? "true" : undefined, page, pageSize: 10 })}`,
        signal,
      ),
    `${activeStore?.id ?? "none"}:${search}:${lowStock}:${page}`,
  );
  const stats = useAsync<InventoryStats>(
    (signal) => api.get(`/products?stats=true`, signal),
    `inventory-stats:${activeStore?.id ?? "none"}`,
  );
  const categoriesState = useAsync<{ id: string; name: string }[]>(
    (signal) => api.get(`/categories?type=product`, signal),
    "product-categories",
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

  const openEdit = (row: ProductRow) => {
    setEditing(row);
    setFormValues({
      name: row.name,
      sku: row.sku ?? "",
      categoryId: row.categoryId ?? "",
      description: "",
      imageUrl: "",
      salePrice: (row.salePrice / 100).toFixed(2).replace(".", ","),
      costPrice: (row.costPrice / 100).toFixed(2).replace(".", ","),
      stock: row.stock,
      minimumStock: row.minimumStock,
      active: row.active,
    });
    setDrawerOpen(true);
  };

  const submitForm = async (values: ProductFormValues) => {
    setSubmitting(true);
    try {
      const payload = { ...values, categoryId: values.categoryId || null };
      if (editing) {
        await api.patch(`/products/${editing.id}`, payload);
        toast.success("Producto actualizado");
      } else {
        await api.post("/products", payload);
        toast.success("Producto creado");
      }
      setDrawerOpen(false);
      list.refetch();
      stats.refetch();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo guardar el producto");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.del(`/products/${deleteId}`);
      toast.success("Producto desactivado");
      setDeleteId(null);
      list.refetch();
      stats.refetch();
    } catch {
      toast.error("No se pudo desactivar el producto");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="text-sm text-neutral-500">Inventario y catálogo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo producto
          </Button>
          <Link to="/products/new">
            <Button>Nuevo (página)</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Valor del inventario"
          value={formatCurrency(stats.data?.inventoryCostValue ?? 0, currency)}
          icon={<Boxes className="h-5 w-5" />}
          hint={`${stats.data?.totalUnits ?? 0} unidades`}
        />
        <StatCard
          label="Valor de venta"
          value={formatCurrency(stats.data?.inventorySaleValue ?? 0, currency)}
        />
        <StatCard
          label="Stock bajo"
          value={String(stats.data?.lowStockCount ?? 0)}
          icon={<TriangleAlert className="h-5 w-5" />}
        />
        <StatCard
          label="Agotados"
          value={String(stats.data?.outOfStockCount ?? 0)}
          icon={<PackageX className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Buscar"
          placeholder="Nombre o SKU"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={lowStock}
              onChange={(event) => {
                setLowStock(event.target.checked);
                setPage(1);
              }}
            />
            Solo stock bajo
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        {list.loading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState description="No hemos podido cargar los productos." onRetry={list.refetch} />
        ) : !list.data || list.data.rows.length === 0 ? (
          <EmptyState
            title="No hay productos"
            description="Crea tu primer producto para verlo aquí."
            action={<Button onClick={openCreate}>Nuevo producto</Button>}
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Producto</TableHeaderCell>
                  <TableHeaderCell>Categoría</TableHeaderCell>
                  <TableHeaderCell>Precio</TableHeaderCell>
                  <TableHeaderCell>Coste</TableHeaderCell>
                  <TableHeaderCell>Stock</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell aria-label="Acciones" />
                </TableRow>
              </TableHead>
              <TableBody>
                {list.data.rows.map((row) => {
                  const isLow = row.stock <= row.minimumStock && row.stock > 0;
                  const isOut = row.stock === 0;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-medium text-neutral-900">{row.name}</span>
                        {row.sku ? (
                          <span className="block text-xs text-neutral-500">{row.sku}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{row.categoryName ?? "—"}</TableCell>
                      <TableCell>{formatCurrency(row.salePrice, currency)}</TableCell>
                      <TableCell>{formatCurrency(row.costPrice, currency)}</TableCell>
                      <TableCell>
                        <span className={isOut || isLow ? "font-medium text-amber-700" : ""}>
                          {row.stock}
                        </span>
                        <span className="text-xs text-neutral-400"> / {row.minimumStock}</span>
                      </TableCell>
                      <TableCell>
                        {isOut ? (
                          <Badge tone="danger">Agotado</Badge>
                        ) : isLow ? (
                          <Badge tone="warning">Stock bajo</Badge>
                        ) : row.active ? (
                          <Badge tone="success">Activo</Badge>
                        ) : (
                          <Badge tone="neutral">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dropdown
                          items={[
                            { label: "Editar", onSelect: () => openEdit(row) },
                            {
                              label: "Desactivar",
                              tone: "danger",
                              disabled: !row.active,
                              onSelect: () => setDeleteId(row.id),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={10} total={list.data.total} onPageChange={setPage} />
          </>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Editar producto" : "Nuevo producto"}
      >
        <ProductForm
          defaultValues={formValues}
          categories={categoryOptions}
          submitting={submitting}
          submitLabel={editing ? "Guardar cambios" : "Crear producto"}
          onSubmit={submitForm}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>

      <ConfirmDialog
        open={deleteId !== null}
        title="Desactivar producto"
        description="El producto dejará de aparecer en nuevas ventas. El historial se conserva."
        confirmLabel="Desactivar"
        tone="danger"
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
