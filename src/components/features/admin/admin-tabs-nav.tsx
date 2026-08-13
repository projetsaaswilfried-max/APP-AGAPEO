"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/reports", label: "Signalements", badgeKey: "reports" },
  { href: "/admin/verifications", label: "Vérifications", badgeKey: "verifications" },
  { href: "/admin/posts", label: "Fil officiel" },
  { href: "/admin/support", label: "Support", badgeKey: "support" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/audit", label: "Journal d'audit" }
] as const;

export interface AdminTabBadgeCounts {
  reports?: number;
  verifications?: number;
  support?: number;
}

export function AdminTabsNav({ badgeCounts = {} }: { badgeCounts?: AdminTabBadgeCounts }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl border border-border/40 select-none overflow-x-auto no-scrollbar">
      {TABS.map((tab) => {
        const isActive = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        const count = "badgeKey" in tab ? badgeCounts[tab.badgeKey] : undefined;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative px-3.5 py-2 text-xs font-medium transition-colors duration-200 rounded-lg whitespace-nowrap shrink-0",
              isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="admin-tabs-active-pill"
                className="absolute inset-0 bg-card rounded-lg shadow-2xs"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {tab.label}
              {Boolean(count) && (
                <span className="flex items-center justify-center text-[10px] font-semibold text-accent-foreground bg-accent rounded-full min-w-[18px] h-[18px] px-1 leading-none">
                  {count! > 99 ? "99+" : count}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
