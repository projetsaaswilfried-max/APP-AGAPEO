"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onChange: (id: string) => void;
  variant?: "line" | "pill";
  className?: string;
}

export function Tabs({
  tabs,
  activeTabId,
  onChange,
  variant = "line",
  className
}: TabsProps) {
  const groupId = React.useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState, tabs.length]);

  const scrollByPage = (direction: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: direction * scrollRef.current.clientWidth * 0.6, behavior: "smooth" });
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          aria-label="Voir les onglets précédents"
          className="absolute left-0 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border/60 shadow-2xs text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-90"
        >
          <ChevronLeft size={13} />
        </button>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "flex items-center gap-1 select-none overflow-x-auto no-scrollbar scroll-smooth",
          canScrollLeft && "pl-9",
          canScrollRight && "pr-9",
          variant === "pill" && "p-1 bg-secondary/80 rounded-full border border-border/30 shadow-2xs",
          variant === "line" && "border-b border-border/40"
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors duration-200 rounded-full shrink-0 whitespace-nowrap border border-transparent",
                variant === "pill" && isActive && "text-foreground font-semibold",
                variant === "pill" && !isActive && "text-muted-foreground hover:text-foreground",
                variant === "line" && isActive && "text-foreground font-semibold",
                variant === "line" && !isActive && "text-muted-foreground hover:text-foreground"
              )}
            >
              {variant === "pill" && isActive && (
                <motion.div
                  layoutId={`${groupId}-active-pill`}
                  className="absolute inset-0 bg-accent-subtle border border-accent/30 rounded-full shadow-2xs"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}

              <span className="relative z-10">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "relative z-10 px-2 py-0.5 text-[10px] font-semibold rounded-full",
                    isActive
                      ? "bg-accent-subtle text-accent"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}

              {variant === "line" && isActive && (
                <motion.div
                  layoutId={`${groupId}-active-underline`}
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label="Voir les onglets suivants"
          className="absolute right-0 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border/60 shadow-2xs text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-90"
        >
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}
