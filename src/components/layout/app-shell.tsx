"use client";

import { useState, ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { TRANSITION_EASE } from "@/core/animations/variants";
import { X, Home, Users, MessageSquare, Bell, User, LayoutGrid, Crown } from "lucide-react";
import Link from "next/link";
import { withUnreadBadges, NavigationItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/core/providers/session-provider";
import { getInitials } from "@/domain/badges";
import { useUnreadCounts } from "@/core/hooks/use-unread-counts";
import { IncompleteProfileBanner } from "./incomplete-profile-banner";
import { PremiumUpsellBanner } from "./premium-upsell-banner";
import { AgapeoLogo } from "@/components/ui/logo";

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  Users,
  MessageSquare,
  Bell,
  User,
  LayoutGrid,
  Crown
};

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { profile } = useSession();
  const initials = getInitials(profile.first_name, profile.last_name);
  const { unreadMessages, unreadNotifications } = useUnreadCounts();
  const navigation = withUnreadBadges(unreadMessages, unreadNotifications);

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased">
      {/* Sidebar Desktop */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Drawer Mobile / Tablette Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: TRANSITION_EASE }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col md:hidden select-none"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-border/60">
                <AgapeoLogo href="/feed" size="sm" />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item: NavigationItem) => {
                  const IconComponent = ICON_MAP[item.iconName] || Home;
                  const isActive = item.isExact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-secondary text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      )}
                    >
                      <IconComponent size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                      <span className="flex-1 tracking-tight">{item.title}</span>
                      {item.badgeCount && (
                        <span className="flex items-center justify-center text-[11px] font-semibold text-accent-foreground bg-accent rounded-full min-w-[20px] h-5 px-1 leading-none">
                          {item.badgeCount > 99 ? "99+" : item.badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-border/60">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/40 border border-border/40">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black font-semibold text-xs flex items-center justify-center overflow-hidden">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatar_url} alt={profile.first_name} className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-semibold text-foreground">{profile.first_name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {profile.photo_verification_status === "VERIFIED" ? "Membre vérifié" : "Profil en cours de vérification"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Viewport Workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-16 md:pb-0">
        <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <IncompleteProfileBanner />
        <PremiumUpsellBanner />

        <main className="flex-1 w-full px-5 py-4 md:py-6 lg:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: TRANSITION_EASE }}
              className="h-full flex flex-col"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom Navigation Mobile */}
      <BottomNav />
    </div>
  );
}
