"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Enveloppe une rangée défilant horizontalement (onglets, filtres en pilules)
 * avec des flèches qui apparaissent/disparaissent selon la position de
 * défilement — sur mobile, rien n'indique autrement qu'il reste du contenu
 * caché à droite.
 */
export function ScrollableRow({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollByAmount = (delta: number) => ref.current?.scrollBy({ left: delta, behavior: "smooth" });

  return (
    <div className="relative min-w-0">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-140)}
          aria-label="Voir les éléments précédents"
          className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border/60 shadow-2xs text-muted-foreground"
        >
          <ChevronLeft size={13} />
        </button>
      )}
      <div ref={ref} onScroll={updateArrows} className={cn("overflow-x-auto no-scrollbar scroll-smooth", className)}>
        {children}
      </div>
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(140)}
          aria-label="Voir les éléments suivants"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border/60 shadow-2xs text-muted-foreground"
        >
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}
