import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, setActiveStoreId } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface StoreSummary {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  role: "owner" | "admin" | "employee";
}

interface AuthContextValue {
  user: AuthUser | null;
  stores: StoreSummary[];
  activeStore: StoreSummary | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  switchStore: (storeId: string) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [activeStoreId, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStores = useCallback(async (): Promise<StoreSummary[]> => {
    const result = await api.get<{ stores: StoreSummary[]; defaultStoreId: string | null }>(
      "/stores",
    );
    setStores(result.stores);
    const nextId =
      result.stores.find((store) => store.id === activeStoreId)?.id ??
      result.defaultStoreId ??
      result.stores[0]?.id ??
      null;
    setActive(nextId);
    setActiveStoreId(nextId);
    return result.stores;
  }, [activeStoreId]);

  const refresh = useCallback(async () => {
    try {
      const result = await api.get<{ user: AuthUser | null }>("/auth/session");
      setUser(result.user);
      if (result.user) {
        await loadStores();
      } else {
        setStores([]);
        setActive(null);
        setActiveStoreId(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadStores]);

  useEffect(() => {
    void refresh();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      await api.post("/auth/login", { email, password });
      await refresh();
    },
    [refresh],
  );

  const signup = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
    }) => {
      await api.post("/auth/signup", input);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
    setStores([]);
    setActive(null);
    setActiveStoreId(null);
  }, []);

  const switchStore = useCallback((storeId: string) => {
    setActive(storeId);
    setActiveStoreId(storeId);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      stores,
      activeStore: stores.find((store) => store.id === activeStoreId) ?? null,
      loading,
      login,
      signup,
      logout,
      switchStore,
      refresh,
    }),
    [user, stores, activeStoreId, loading, login, signup, logout, switchStore, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
