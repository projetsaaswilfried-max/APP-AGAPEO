"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScrollableRow } from "@/components/ui/scrollable-row";
import type { AppRole } from "@/lib/supabase/database.types";

// minRole = niveau minimal pour voir l'onglet — cf. requireStaffSession
// (MODERATOR+), requireAdminSession (ADMIN+) et requireSuperAdminSession
// (SUPER_ADMIN) dans src/lib/supabase/session.ts, qui appliquent la même
// restriction côté page/action.
//
// "Accueil" et "Découvrir" ne sont pas des pages d'administration : ce sont
// des raccourcis vers les vraies pages membre (/feed, /discover), pour que
// l'équipe puisse voir la plateforme telle que les membres la voient, sans
// sortir de ce menu pour la retrouver. Le staff (is_staff) y a déjà un accès
// complet, aucune logique supplémentaire n'est nécessaire côté page.
const TABS = [
  { href: "/feed", label: "Accueil", minRole: "MODERATOR" },
  { href: "/discover", label: "Découvrir", minRole: "MODERATOR" },
  { href: "/ayekoutche/overview", label: "Vue d'ensemble", minRole: "MODERATOR" },
  { href: "/ayekoutche/reports", label: "Signalements", badgeKey: "reports", minRole: "MODERATOR" },
  { href: "/ayekoutche/verifications", label: "Vérifications", badgeKey: "verifications", minRole: "MODERATOR" },
  { href: "/ayekoutche/photos", label: "Photos", badgeKey: "photos", minRole: "MODERATOR" },
  { href: "/ayekoutche/support", label: "Support", badgeKey: "support", minRole: "MODERATOR" },
  { href: "/ayekoutche/team", label: "Équipe", minRole: "MODERATOR" },
  { href: "/ayekoutche/users", label: "Utilisateurs", minRole: "ADMIN" },
  { href: "/ayekoutche/posts", label: "Fil officiel", minRole: "ADMIN" },
  { href: "/ayekoutche/emails", label: "Emails", minRole: "ADMIN" },
  { href: "/ayekoutche/transactions", label: "Transactions", minRole: "ADMIN" },
  { href: "/ayekoutche/finances", label: "Finances", minRole: "SUPER_ADMIN" },
  { href: "/ayekoutche/payments", label: "Paiements", minRole: "SUPER_ADMIN" },
  { href: "/ayekoutche/audit", label: "Journal d'audit", minRole: "SUPER_ADMIN" }
] as const;

const ROLE_RANK: Record<AppRole, number> = { USER: 0, MODERATOR: 1, ADMIN: 2, SUPER_ADMIN: 3 };

export interface AdminTabBadgeCounts {
  reports?: number;
  verifications?: number;
  photos?: number;
  support?: number;
}

export function AdminTabsNav({ role, badgeCounts = {} }: { role: AppRole; badgeCounts?: AdminTabBadgeCounts }) {
  const pathname = usePathname();
  const visibleTabs = TABS.filter((tab) => ROLE_RANK[role] >= ROLE_RANK[tab.minRole]);

  return (
    <ScrollableRow className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl border border-border/40 select-none">
      {visibleTabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
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
    </ScrollableRow>
  );
}
