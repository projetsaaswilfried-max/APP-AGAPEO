"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  iconOnly?: boolean;
  href?: string;
  className?: string;
}

const SIZES = {
  xs: { box: "w-6 h-6", text: "text-sm", gap: "gap-1.5" },
  sm: { box: "w-9 h-9", text: "text-lg", gap: "gap-2.5" },
  md: { box: "w-10 h-10", text: "text-lg", gap: "gap-2.5" },
  lg: { box: "w-12 h-12", text: "text-xl", gap: "gap-3" },
  xl: { box: "w-16 h-16", text: "text-2xl", gap: "gap-3.5" }
};

export function AgapeoSymbol({ className }: { className?: string }) {
  return (
    <div className={cn("relative shrink-0 select-none flex items-center justify-center", className)}>
      <Image
        src="/images/agapeo-symbol.png"
        alt="AGAPEO"
        width={700}
        height={733}
        priority
        className="w-full h-full object-contain filter drop-shadow-sm"
      />
    </div>
  );
}

export function AgapeoLogo({ size = "md", iconOnly = false, href, className }: LogoProps) {
  const { box, text, gap } = SIZES[size];

  const content = (
    <div className={cn("inline-flex items-center shrink-0 select-none cursor-pointer group", gap, className)}>
      <div className={cn("relative shrink-0 transition-transform duration-200 group-hover:scale-105", box)}>
        <AgapeoSymbol className="w-full h-full" />
      </div>
      {!iconOnly && (
        <span className={cn("font-display font-bold tracking-tight text-foreground leading-none whitespace-nowrap", text)}>
          AGAPEO
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
