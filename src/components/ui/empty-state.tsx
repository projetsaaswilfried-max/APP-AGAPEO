"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-dashed border-border/70 rounded-2xl bg-card/50 my-4 space-y-3",
        className
      )}
    >
      {icon && (
        <div className="p-3 rounded-2xl bg-secondary text-muted-foreground shadow-2xs mb-1">
          {icon}
        </div>
      )}
      <h4 className="text-base font-display font-semibold tracking-tight text-foreground">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
