import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
}

export function Card({
  as: Tag = "div",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-neutral-200 bg-white",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  className,
  children,
  title,
  action,
}: {
  className?: string;
  children?: ReactNode;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4",
        className,
      )}
    >
      {title ? (
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      ) : (
        children
      )}
      {action}
    </div>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}
