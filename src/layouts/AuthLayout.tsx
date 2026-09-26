import type { ReactNode } from "react";
import { Store } from "lucide-react";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Store className="h-6 w-6 text-brand-600" aria-hidden="true" />
          <span className="text-lg font-semibold tracking-tight">Shop Manager</span>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
          ) : null}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
