"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search01Icon, Cancel01Icon, EyeIcon, EyeOffIcon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";
    const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;
    const resolvedRightIcon = isPassword ? (
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        tabIndex={-1}
      >
        <HugeIcon icon={showPassword ? EyeOffIcon : EyeIcon} size={17} />
      </button>
    ) : (
      rightIcon
    );

    return (
      <div className="w-full space-y-1 select-none">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-foreground tracking-tight"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 text-muted-foreground pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            type={resolvedType}
            ref={ref}
            className={cn(
              "flex h-11 w-full rounded-full border border-border/50 bg-secondary/60 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:bg-card disabled:cursor-not-allowed disabled:opacity-50",
              leftIcon && "pl-11",
              resolvedRightIcon && "pr-11",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            {...props}
          />

          {resolvedRightIcon && (
            <div className="absolute right-3.5 text-muted-foreground">
              {resolvedRightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-destructive font-medium pl-1">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface SearchInputProps
  extends Omit<InputProps, "leftIcon" | "rightIcon"> {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        value={value}
        onChange={onChange}
        leftIcon={<HugeIcon icon={Search01Icon} size={16} />}
        rightIcon={
          value && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="p-1 hover:text-foreground rounded-full transition-colors"
            >
              <HugeIcon icon={Cancel01Icon} size={14} />
            </button>
          ) : undefined
        }
        className={cn("bg-secondary/40 focus-visible:bg-card", className)}
        {...props}
      />
    );
  }
);
SearchInput.displayName = "SearchInput";
