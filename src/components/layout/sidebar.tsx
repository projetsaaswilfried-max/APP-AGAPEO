"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home01Icon,
  UserGroupIcon,
  UserAdd01Icon,
  Message01Icon,
  Notification01Icon,
  UserIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Crown02Icon
} from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { withUnreadBadges, NavigationItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/core/providers/session-provider";
import { getInitials } from "@/domain/badges";
import { useUnreadCounts } from "@/core/hooks/use-unread-counts";
import { Avatar } from "@/components/ui/avatar";
import { AgapeoLogo } from "@/components/ui/logo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  Home: Home01Icon,
  Users: UserGroupIcon,
  UserPlus: UserAdd01Icon,
  MessageSquare: Message01Icon,
  Bell: Notification01Icon,
  User: UserIcon,
  Crown: Crown02Icon
};

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function NavItemContent({
  item,
  isActive,
  isCollapsed
}: {
  item: NavigationItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const iconObj = ICON_MAP[item.iconName] || Home01Icon;
  return (
    <>
      {isActive && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="absolute inset-0 bg-accent-subtle border border-accent/30 rounded-full shadow-2xs"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}

      <HugeIcon
        icon={iconObj}
        size={18}
        className={cn(
          "relative z-10 shrink-0 transition-colors",
          isActive ? "text-primary font-bold" : "text-muted-foreground group-hover:text-foreground"
        )}
      />

      {!isCollapsed && <span className="relative z-10 flex-1 truncate tracking-tight">{item.title}</span>}

      {item.badgeCount && item.badgeCount > 0 && (
        <span
          className={cn(
            "relative z-10 flex items-center justify-center text-[11px] font-semibold rounded-full min-w-[20px] h-5 px-1 leading-none",
            isActive ? "bg-card text-primary font-bold" : "bg-primary text-primary-foreground",
            isCollapsed && "absolute top-1 right-1 min-w-4 h-4 text-[9px] px-0.5"
          )}
        >
          {item.badgeCount > 99 ? "99+" : item.badgeCount}
        </span>
      )}
    </>
  );
}

export function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useSession();
  const initials = getInitials(profile.first_name, profile.last_name);
  const { unreadMessages, unreadNotifications } = useUnreadCounts();
  // Notifications retiré du menu latéral — reste accessible via la cloche
  // du header (desktop et mobile) et la barre de navigation mobile.
  const navigation = withUnreadBadges(unreadMessages, unreadNotifications).filter((item) => item.id !== "notifications");

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 bg-card transition-all duration-300 z-30 select-none",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header Branding */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/40">
        <AgapeoLogo href="/feed" size="sm" iconOnly={isCollapsed} />

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
            title={isCollapsed ? "Déplier la navigation" : "Réduire la navigation"}
            aria-label="Toggle Sidebar"
          >
            {isCollapsed ? <HugeIcon icon={ArrowRight01Icon} size={16} /> : <HugeIcon icon={ArrowLeft01Icon} size={16} />}
          </button>
        )}
      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navigation.map((item: NavigationItem) => {
          const isActive = item.isExact ? pathname === item.href : pathname.startsWith(item.href);
          const itemClassName = cn(
            "relative flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium text-left transition-colors duration-200 group border border-transparent w-full",
            isActive
              ? "text-foreground font-semibold border-accent/30"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
            isCollapsed && "justify-center px-0"
          );

          return (
            <Link key={item.id} href={item.href} className={itemClassName}>
              <NavItemContent item={item} isActive={isActive} isCollapsed={isCollapsed} />
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile Status */}
      <div className="p-3 border-t border-border/40">
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-secondary/50 border border-border/40">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Avatar
                size="sm"
                src={profile.avatar_url ?? undefined}
                fallback={initials}
                isVerified={profile.photo_verification_status === "VERIFIED"}
              />
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-foreground truncate">
                  {profile.first_name}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {profile.is_staff
                    ? "Compte équipe"
                    : profile.photo_verification_status === "VERIFIED"
                      ? "Membre vérifié"
                      : "Profil en cours de vérification"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1" title={profile.first_name}>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-medium text-xs text-foreground overflow-hidden">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.first_name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
