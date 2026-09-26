import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400"
        aria-hidden="true"
      >
        {icon ?? <Inbox className="h-6 w-6" />}
      </span>
      <p className="text-sm font-medium text-neutral-800">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-neutral-500">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
