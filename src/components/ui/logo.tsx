"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  symbolOnly?: boolean;
  href?: string;
  className?: string;
  textClassName?: string;
}

const SIZES = {
  xs: { box: "w-6 h-6", text: "text-sm", gap: "gap-1.5" },
  sm: { box: "w-8 h-8", text: "text-base", gap: "gap-2" },
  md: { box: "w-10 h-10", text: "text-lg", gap: "gap-2.5" },
  lg: { box: "w-12 h-12", text: "text-xl", gap: "gap-3" },
  xl: { box: "w-16 h-16", text: "text-2xl", gap: "gap-3.5" }
};

export function AgapeoSymbol({ className }: { className?: string }) {
  return (
    <div className={cn("relative shrink-0 select-none flex items-center justify-center", className)}>
      <Image
        src="/images/agapeo-logo-official.png"
        alt="AGAPEO Monogram Official Logo"
        width={440}
        height={390}
        priority
        className="w-full h-full object-contain filter drop-shadow-sm"
      />
    </div>
  );
}

export function AgapeoLogo({
  size = "md",
  symbolOnly = false,
  href,
  className,
  textClassName
}: LogoProps) {
  const { box, text, gap } = SIZES[size];

  const content = (
    <div className={cn("inline-flex items-center group cursor-pointer select-none", gap, className)}>
      <div className={cn("relative flex items-center justify-center transition-transform duration-200 group-hover:scale-105", box)}>
        <AgapeoSymbol className="w-full h-full" />
      </div>
      {!symbolOnly && (
        <div className="flex flex-col">
          <span className={cn("font-display font-bold tracking-tight text-foreground leading-none", text, textClassName)}>
            AGAPEO
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
