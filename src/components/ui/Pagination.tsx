import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  return (
    <nav
      aria-label="Paginación"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm",
        className,
      )}
    >
      <p className="text-neutral-500">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </Button>
        <span aria-current="page" className="px-2 text-neutral-700">
          {current} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(current + 1)}
          disabled={current >= pageCount}
          aria-label="Página siguiente"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
