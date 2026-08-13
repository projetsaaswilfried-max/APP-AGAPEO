"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    { checked = false, onCheckedChange, disabled = false, label, description, className },
    ref
  ) => {
    return (
      <div className="flex items-center justify-between space-x-4 select-none">
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-foreground tracking-tight">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground mt-0.5">
                {description}
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          role="switch"
          ref={ref}
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onCheckedChange?.(!checked)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40",
            checked ? "bg-primary" : "bg-secondary border-border/60",
            className
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out",
              checked ? "translate-x-5 bg-primary-foreground" : "translate-x-0"
            )}
          />
        </button>
      </div>
    );
  }
);
Switch.displayName = "Switch";
