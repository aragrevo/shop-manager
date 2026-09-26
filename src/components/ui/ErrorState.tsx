import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Algo ha ido mal",
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"
        aria-hidden="true"
      >
        <AlertTriangle className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-neutral-800">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-neutral-500">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
