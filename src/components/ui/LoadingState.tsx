import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({
  label = "Cargando…",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-12 text-neutral-500",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
