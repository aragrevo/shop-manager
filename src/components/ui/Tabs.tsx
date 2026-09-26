import { useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: readonly TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + items.length) % items.length;
    const nextItem = items[next];
    if (!nextItem) return;
    onChange(nextItem.value);
    tabRefs.current[next]?.focus();
  };

  const active = items.find((item) => item.value === value) ?? items[0];

  return (
    <div className={className}>
      <div role="tablist" aria-orientation="horizontal" className="flex gap-1 border-b border-neutral-200">
        {items.map((item, index) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                selected
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-800",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active.value}`}
          aria-labelledby={`${baseId}-tab-${active.value}`}
          className="pt-4"
        >
          {active.content}
        </div>
      ) : null}
    </div>
  );
}
