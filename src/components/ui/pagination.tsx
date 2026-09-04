"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Fenêtre de pages voisines affichées autour de la page courante — au-delà, "…" remplace le trou plutôt que de lister toutes les pages. */
function buildPageWindow(current: number, total: number): (number | "ellipsis")[] {
  const window = 1;
  const pages = new Set<number>([1, total, current]);
  for (let i = current - window; i <= current + window; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  sorted.forEach((page, idx) => {
    if (idx > 0 && page - sorted[idx - 1] > 1) result.push("ellipsis");
    result.push(page);
  });
  return result;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pageWindow = buildPageWindow(currentPage, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1.5 pt-2" aria-label="Pagination">
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Page précédente"
      >
        <ChevronLeft size={16} />
      </Button>

      {pageWindow.map((page, idx) =>
        page === "ellipsis" ? (
          <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted-foreground select-none">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`h-9 min-w-9 px-2.5 rounded-full text-xs font-medium transition-colors ${
              page === currentPage
                ? "bg-primary text-primary-foreground shadow-accent-glow"
                : "text-foreground hover:bg-secondary border border-border bg-card"
            }`}
          >
            {page}
          </button>
        )
      )}

      <Button
        variant="outline"
        size="icon"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Page suivante"
      >
        <ChevronRight size={16} />
      </Button>
    </nav>
  );
}
