import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (toast: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-brand-200 bg-brand-50 text-brand-800",
};

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success")
    return <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />;
  if (tone === "error")
    return <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />;
  return <Info className="h-5 w-5 text-brand-600" aria-hidden="true" />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (title, description) => show({ title, description, tone: "success" }),
      error: (title, description) => show({ title, description, tone: "error" }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-md border px-4 py-3 shadow-sm",
              toneStyles[toast.tone],
            )}
          >
            <ToastIcon tone={toast.tone} />
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.description ? (
                <p className="text-xs opacity-90">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              aria-label="Cerrar notificación"
              className="rounded p-0.5 hover:bg-black/5"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
