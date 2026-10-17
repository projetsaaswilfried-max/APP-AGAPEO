"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home01Icon,
  News01Icon,
  UserGroupIcon,
  Message01Icon,
  Notification01Icon,
  UserIcon
} from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { withUnreadBadges, NavigationItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useUnreadCounts } from "@/core/providers/unread-counts-provider";
import { saveScrollForCurrentPage } from "@/core/hooks/use-scroll-memory";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  Home: Home01Icon,
  News: News01Icon,
  Users: UserGroupIcon,
  MessageSquare: Message01Icon,
  Bell: Notification01Icon,
  User: UserIcon
};

function NavItemInner({ item, isActive }: { item: NavigationItem; isActive: boolean }) {
  const iconObj = ICON_MAP[item.iconName] || Home01Icon;
  return (
    <>
      {isActive && (
        <motion.div
          layoutId="bottom-nav-active-pill"
          className="absolute inset-0 bg-accent-subtle border border-accent/30 rounded-full"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}

      <div className="relative z-10 flex items-center justify-center">
        <HugeIcon icon={iconObj} size={18} className={cn("transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
        {item.badgeCount && item.badgeCount > 0 && (
          <span
            className={cn(
              "absolute -top-1.5 -right-2.5 flex items-center justify-center text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 leading-none",
              isActive ? "bg-card text-primary" : "bg-primary text-primary-foreground"
            )}
          >
            {item.badgeCount > 99 ? "99+" : item.badgeCount}
          </span>
        )}
      </div>
      {isActive && <span className="relative z-10 truncate tracking-tight font-medium text-xs">{item.title}</span>}
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { unreadMessages, unreadNotifications } = useUnreadCounts();
  // 4 actions principales : Accueil, Découvrir, Messages, Fil. "Mon Profil"
  // et "Premium" sont dans le menu de l'avatar du header, les notifications
  // derrière sa cloche — la barre du bas ne déborde jamais.
  const navigation = withUnreadBadges(unreadMessages, unreadNotifications).filter(
    (item) => item.id !== "profile" && item.id !== "premium" && item.id !== "notifications"
  );

  // Une conversation ouverte occupe tout l'écran sur mobile (cf. messages
  // page.tsx) — la barre du bas n'y a plus sa place, elle vole de l'espace
  // vertical précieux au-dessus du champ de saisie. Invisible sur desktop de
  // toute façon (`md:hidden` ci-dessous), donc sans risque à masquer ainsi.
  const isConversationOpen = pathname === "/messages" && Boolean(searchParams.get("conversation"));
  if (isConversationOpen) return null;

  return (
    // Même marge intérieure sur les quatre côtés : p-1.5 pour la barre, p-2.5 pour chaque bouton,
    // et justify-between (pas d'espace supplémentaire accumulé aux deux extrémités).
    <div className="md:hidden fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40 bg-card/90 backdrop-blur-xl rounded-full border border-border/40 p-1.5 select-none">
      <nav className="flex items-center justify-between">
        {navigation.map((item: NavigationItem) => {
          const isActive = item.isExact ? pathname === item.href : pathname.startsWith(item.href);
          const itemClassName = cn(
            "relative flex items-center justify-center gap-1.5 p-2.5 rounded-full text-xs font-medium transition-colors duration-200 border border-transparent",
            isActive ? "text-primary font-semibold border-accent/30" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          );

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={item.id === "notifications" ? saveScrollForCurrentPage : undefined}
              className={itemClassName}
            >
              <NavItemInner item={item} isActive={isActive} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
