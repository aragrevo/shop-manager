import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left";
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = "right",
}: DrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex bg-neutral-900/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "flex h-full w-full max-w-md flex-col bg-white shadow-sm focus-visible:outline-none",
          side === "right" ? "ml-auto" : "mr-auto",
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-neutral-900">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
