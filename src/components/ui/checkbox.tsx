"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { className, checked = false, onCheckedChange, label, description, disabled, id, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    return (
      <div className="flex items-start space-x-3 select-none">
        <div className="relative flex items-center h-5">
          <input
            type="checkbox"
            id={checkboxId}
            ref={ref}
            checked={checked}
            disabled={disabled}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            className="peer sr-only"
            {...props}
          />
          <div
            onClick={() => !disabled && onCheckedChange?.(!checked)}
            className={cn(
              "h-5 w-5 rounded-md border border-border bg-card transition-all duration-150 flex items-center justify-center cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1",
              checked && "bg-primary text-primary-foreground border-primary",
              disabled && "opacity-40 cursor-not-allowed",
              className
            )}
          >
            {checked && <HugeIcon icon={Tick01Icon} size={14} strokeWidth={3} className="text-primary-foreground" />}
          </div>
        </div>

        {(label || description) && (
          <label
            htmlFor={checkboxId}
            className={cn(
              "flex flex-col cursor-pointer leading-none",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {label && (
              <span className="text-sm font-medium text-foreground tracking-tight">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {description}
              </span>
            )}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";
