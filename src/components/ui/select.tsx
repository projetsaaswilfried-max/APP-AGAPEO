"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Largeur du conteneur — "auto" (par défaut) : pleine largeur sur mobile, largeur naturelle dès sm (barres d'outils) ; "full" : pleine largeur à tous les breakpoints (formulaires en grille). */
  wrapperWidth?: "auto" | "full";
}

/** Menu déroulant natif avec chevron d'orientation (ouvert/fermé) toujours visible, indépendamment du rendu natif du navigateur. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, wrapperWidth = "auto", ...props }, ref) => {
  return (
    <div className={cn("relative inline-flex items-center", wrapperWidth === "full" ? "w-full" : "w-full sm:w-auto")}>
      <select
        ref={ref}
        className={cn(
          "appearance-none w-full text-xs h-9 bg-card border border-border/60 rounded-xl pl-2.5 pr-8 text-foreground disabled:opacity-60 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-muted-foreground shrink-0" />
    </div>
  );
});
Select.displayName = "Select";
