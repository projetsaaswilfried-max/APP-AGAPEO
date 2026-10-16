"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsGroupProps {
  title?: string;
  children: React.ReactNode;
}

/** Groupe de lignes façon réglages iOS (format app native : `AppSettingsGroup`) — titre optionnel au-dessus d'un bloc bordé, lignes séparées par un filet. */
export function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <div className="space-y-2">
      {title && <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">{title}</h3>}
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">{children}</div>
    </div>
  );
}

interface SettingsRowProps {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  danger?: boolean;
  disabled?: boolean;
  showChevron?: boolean;
  onClick?: () => void;
  href?: string;
}

/** Ligne de réglage façon app native (`AppSettingsRow`) : icône + libellé (+ valeur en lecture seule) + chevron si tappable. `href` rend un `Link`, `onClick` un bouton, ni l'un ni l'autre rend une ligne purement informative (pas de chevron). */
export function SettingsRow({ icon, label, value, danger = false, disabled = false, showChevron = true, onClick, href }: SettingsRowProps) {
  const content = (
    <>
      {icon && (
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            danger ? "bg-destructive/12 text-destructive" : "bg-primary/12 text-primary"
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", danger ? "text-destructive" : "text-foreground")}>{label}</p>
        {value && <p className="text-xs text-muted-foreground truncate mt-0.5">{value}</p>}
      </div>
      {(onClick || href) && showChevron && !disabled && (
        <ChevronRight size={16} className={cn("shrink-0", danger ? "text-destructive/70" : "text-muted-foreground")} />
      )}
    </>
  );

  const rowClass = cn(
    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
    (onClick || href) && !disabled && "hover:bg-secondary/50 active:bg-secondary/70",
    disabled && "opacity-50"
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    );
  }
  if (onClick && !disabled) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {content}
      </button>
    );
  }
  return <div className={rowClass}>{content}</div>;
}
