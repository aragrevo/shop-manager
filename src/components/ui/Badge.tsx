import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  /** Leading glyph so state is not conveyed by color alone. */
  icon?: ReactNode;
}

const tones: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-brand-50 text-brand-700 border-brand-200",
};

const defaultIcon: Record<BadgeTone, string> = {
  neutral: "•",
  success: "✓",
  warning: "!",
  danger: "✕",
  info: "i",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  icon,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      <span aria-hidden="true">{icon ?? defaultIcon[tone]}</span>
      {children}
    </span>
  );
}
