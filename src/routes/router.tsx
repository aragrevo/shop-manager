import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/layouts/AppLayout";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

const LoginPage = lazy(() =>
  import("@/pages/Login").then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import("@/pages/Signup").then((m) => ({ default: m.SignupPage })),
);
const DashboardPage = lazy(() =>
  import("@/pages/Dashboard").then((m) => ({ default: m.DashboardPage })),
);
const SalesPage = lazy(() =>
  import("@/pages/Sales").then((m) => ({ default: m.SalesPage })),
);
const SaleNewPage = lazy(() =>
  import("@/pages/SaleNew").then((m) => ({ default: m.SaleNewPage })),
);
const SaleDetailPage = lazy(() =>
  import("@/pages/SaleDetail").then((m) => ({ default: m.SaleDetailPage })),
);
const ExpensesPage = lazy(() =>
  import("@/pages/Expenses").then((m) => ({ default: m.ExpensesPage })),
);
const ExpenseNewPage = lazy(() =>
  import("@/pages/ExpenseNew").then((m) => ({ default: m.ExpenseNewPage })),
);
// Productos deshabilitado por ahora.
// const ProductsPage = lazy(() =>
//   import("@/pages/Products").then((m) => ({ default: m.ProductsPage })),
// );
// const ProductNewPage = lazy(() =>
//   import("@/pages/ProductNew").then((m) => ({ default: m.ProductNewPage })),
// );
// Clientes deshabilitado por ahora.
// const CustomersPage = lazy(() =>
//   import("@/pages/Customers").then((m) => ({ default: m.CustomersPage })),
// );
// const CustomerDetailPage = lazy(() =>
//   import("@/pages/CustomerDetail").then((m) => ({ default: m.CustomerDetailPage })),
// );
const ReportsPage = lazy(() =>
  import("@/pages/Reports").then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/Settings").then((m) => ({ default: m.SettingsPage })),
);

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState label="Comprobando sesión…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label="Comprobando sesión…" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingState label="Cargando…" />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignupPage />
            </PublicOnlyRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/new" element={<SaleNewPage />} />
          <Route path="/sales/:id" element={<SaleDetailPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/expenses/new" element={<ExpenseNewPage />} />
          {/* Productos deshabilitado por ahora.
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductNewPage />} />
          Clientes deshabilitado por ahora.
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} /> */}
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="*"
          element={<EmptyState title="Página no encontrada" description="La ruta no existe." />}
        />
      </Routes>
    </Suspense>
  );
}
