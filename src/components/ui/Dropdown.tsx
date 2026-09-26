import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
}

export interface DropdownProps {
  items: readonly DropdownItem[];
  label?: string;
  align?: "start" | "end";
  trigger?: ReactNode;
}

export function Dropdown({
  items,
  label = "Acciones",
  align = "end",
  trigger,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        variant="ghost"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        {trigger ?? <MoreVertical className="h-4 w-4" aria-hidden="true" />}
      </Button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-40 mt-1 min-w-44 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-sm",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50",
                item.tone === "danger" ? "text-red-600" : "text-neutral-700",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
