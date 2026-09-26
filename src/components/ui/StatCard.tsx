import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "./Card";

export interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  delta?: {
    value: string;
    direction: "up" | "down" | "flat";
    /** Whether an upward move is good (green) or bad (red). */
    positiveIsGood?: boolean;
  };
  hint?: string;
}

const toneBox: Record<string, string> = {
  default: "bg-brand-50 text-brand-600",
};

export function StatCard({
  label,
  value,
  icon,
  delta,
  hint,
}: StatCardProps) {
  const positive = delta?.direction === "up";
  const goodTone =
    delta && delta.direction !== "flat"
      ? positive === (delta.positiveIsGood ?? true)
        ? "text-green-600"
        : "text-red-600"
      : "text-neutral-500";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
            {value}
          </p>
        </div>
        {icon ? (
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md",
              toneBox.default,
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>
      {delta ? (
        <p className={cn("mt-3 flex items-center gap-1 text-xs font-medium", goodTone)}>
          <span aria-hidden="true">
            {delta.direction === "down" ? (
              <ArrowDownRight className="h-4 w-4" />
            ) : delta.direction === "up" ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              "→"
            )}
          </span>
          {delta.value}
          <span className="text-neutral-400">vs. periodo anterior</span>
        </p>
      ) : null}
      {hint ? <p className="mt-1 text-xs text-neutral-400">{hint}</p> : null}
    </Card>
  );
}
