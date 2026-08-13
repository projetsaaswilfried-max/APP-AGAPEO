"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "verified" | "new" | "premium" | "compatibility" | "status";
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "status", children, ...props }, ref) => {
    const variants = {
      verified:
        "bg-accent-subtle text-accent border border-accent/20 font-medium",
      new: "bg-primary text-primary-foreground font-medium shadow-accent-glow",
      premium:
        "bg-dark-control text-dark-control-foreground font-medium",
      compatibility:
        "bg-accent-subtle text-accent border border-accent/30 font-semibold",
      status: "bg-secondary text-secondary-foreground border border-border/40"
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight select-none transition-colors",
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Badge.displayName = "Badge";
