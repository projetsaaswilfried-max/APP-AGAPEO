"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/ui/verified-badge";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  isVerified?: boolean;
  isOnline?: boolean;
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt = "Avatar",
      fallback = "U",
      size = "md",
      isVerified = false,
      isOnline = false,
      ...props
    },
    ref
  ) => {
    const [hasError, setHasError] = React.useState(false);

    const sizes = {
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-14 w-14 text-base",
      xl: "h-20 w-20 text-xl font-semibold"
    };

    const badgePositions = {
      sm: "bottom-0 right-0",
      md: "bottom-0 right-0",
      lg: "bottom-0.5 right-0.5",
      xl: "bottom-1 right-1"
    };

    const badgeSizeBySize = {
      sm: "xs" as const,
      md: "sm" as const,
      lg: "md" as const,
      xl: "lg" as const
    };

    return (
      <div
        ref={ref}
        className="relative inline-block shrink-0 select-none"
        {...props}
      >
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full overflow-hidden bg-secondary text-foreground font-medium border border-border/60 shadow-2xs",
            sizes[size],
            className
          )}
        >
          {src && !hasError ? (
            <img
              src={src}
              alt={alt}
              onError={() => setHasError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{fallback}</span>
          )}
        </div>

        {/* Badge de vérification (façon coche bleue) */}
        {isVerified && (
          <VerifiedBadge
            size={badgeSizeBySize[size]}
            className={cn("absolute shadow-2xs", badgePositions[size])}
            title="Membre Authentifié"
          />
        )}

        {/* Online Status Indicator — coin haut-droit pour ne jamais entrer en conflit avec le badge vérifié */}
        {isOnline && (
          <div
            className={cn(
              "absolute rounded-full bg-emerald-500 ring-2 ring-background",
              size === "sm" ? "h-2 w-2 top-0 right-0" : "h-2.5 w-2.5 top-0.5 right-0.5"
            )}
            title="En ligne"
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";
