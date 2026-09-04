"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // leading-snug : garde les libellés qui passent sur 2 lignes lisibles et
    // compacts entre eux, pendant que le py des tailles ci-dessous gère
    // l'espace vers les bords arrondis du bouton.
    const baseStyles =
      "inline-flex items-center justify-center font-medium tracking-tight leading-snug rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97] select-none";

    const variants = {
      primary:
        "bg-primary text-primary-foreground hover:opacity-95 shadow-accent-glow font-medium",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium",
      outline:
        "border border-border bg-card hover:bg-secondary text-foreground font-medium",
      ghost: "hover:bg-secondary text-foreground hover:text-foreground font-medium",
      link: "text-foreground underline-offset-4 hover:underline p-0 h-auto font-normal",
      destructive:
        "bg-destructive text-destructive-foreground hover:opacity-90 shadow-2xs"
    };

    // min-h (pas h fixe) + padding vertical : un libellé qui passe sur 2 lignes
    // (bouton pleine largeur avec texte long, cf. choix Mobile Money/Carte de
    // la page Premium) grandit proprement au lieu d'écraser le texte contre
    // les bords arrondis de la pilule. Sur une seule ligne, le résultat est
    // identique à avant (le padding vertical + la hauteur de ligne restent
    // sous le min-h, qui fixe donc la hauteur réelle).
    const sizes = {
      sm: "min-h-8 px-3.5 py-1.5 text-xs gap-1.5",
      md: "min-h-10 px-5 py-2 text-sm gap-2",
      lg: "min-h-12 px-7 py-2.5 text-base gap-2.5",
      icon: "h-10 w-10 p-0 shrink-0 rounded-full"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
