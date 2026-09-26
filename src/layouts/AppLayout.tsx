import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShoppingCart,
  Store,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/context/AuthContext";

const navigation = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { to: "/sales", label: "Ventas", icon: ShoppingCart },
  { to: "/expenses", label: "Gastos", icon: Receipt },
  { to: "/products", label: "Productos", icon: Boxes },
  { to: "/customers", label: "Clientes", icon: Users },
  { to: "/reports", label: "Informes", icon: BarChart3 },
  { to: "/settings", label: "Ajustes", icon: Settings },
];

export function AppLayout() {
  const { user, stores, activeStore, switchStore, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-neutral-900 text-neutral-100">
      <div className="flex items-center gap-2 px-5 py-5">
        <Store className="h-6 w-6 text-brand-400" aria-hidden="true" />
        <span className="text-lg font-semibold tracking-tight">Shop Manager</span>
      </div>

      {stores.length > 0 ? (
        <div className="px-3 pb-3">
          <label htmlFor="store-switcher" className="sr-only">
            Tienda activa
          </label>
          <select
            id="store-switcher"
            value={activeStore?.id ?? ""}
            onChange={(event) => switchStore(event.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <nav className="flex-1 space-y-1 px-3" aria-label="Principal">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-white",
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-neutral-800 p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="truncate text-xs text-neutral-400">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="hidden w-64 shrink-0 md:block">{sidebar}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64">{sidebar}</div>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="flex-1 bg-neutral-900/50"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            className="rounded-md p-2 hover:bg-neutral-100"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <span className="font-semibold">
            {activeStore?.name ?? "Shop Manager"}
          </span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
