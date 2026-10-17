"use client";

import { useState, ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import { TRANSITION_EASE } from "@/core/animations/variants";
import { cn } from "@/lib/utils";
import { UnreadCountsProvider } from "@/core/providers/unread-counts-provider";
import { useRestoreScrollMemory } from "@/core/hooks/use-scroll-memory";
import { IncompleteProfileBanner } from "./incomplete-profile-banner";
import { PremiumUpsellBanner } from "./premium-upsell-banner";
import { PremiumWelcomeNudge } from "@/components/features/premium/premium-welcome-nudge";

interface AppShellProps {
  children: ReactNode;
}

/** Un seul `<UnreadCountsProvider>` pour tout l'arbre (Sidebar/Header/BottomNav/lui-même en dessous) — cf. commentaire du provider pour le pourquoi. */
export function AppShell(props: AppShellProps) {
  return (
    <UnreadCountsProvider>
      <AppShellContent {...props} />
    </UnreadCountsProvider>
  );
}

function AppShellContent({ children }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Une conversation ouverte prend tout l'écran sur mobile (cf. messages
  // page.tsx) — la barre du bas y disparaît (bottom-nav.tsx) et l'espace
  // qu'AppShell lui réservait ici (pb-16) doit être rendu au contenu.
  const isConversationOpen = pathname === "/messages" && Boolean(searchParams.get("conversation"));
  useRestoreScrollMemory(pathname);

  return (
    // Menu et header partagent le même fond (bg-card) ; le contenu est posé
    // sur un panneau gris (bg-background) à coin supérieur gauche arrondi.
    <div className="min-h-screen flex bg-card text-foreground antialiased">
      {/* Sidebar Desktop */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Viewport Workspace */}
      <div className={cn("flex-1 flex flex-col min-w-0 min-h-screen md:pb-0", isConversationOpen ? "pb-0" : "pb-16")}>
        {/* Discussion ouverte sur mobile : plein écran façon WhatsApp — ni header d'app, ni bandeaux, ni marges. */}
        <Header className={cn(isConversationOpen && "max-md:hidden")} />

        <div className="flex-1 flex flex-col bg-background md:rounded-tl-[40px]">
          <div className={cn(isConversationOpen && "max-md:hidden")}>
            <IncompleteProfileBanner />
            <PremiumUpsellBanner />
            <PremiumWelcomeNudge />
          </div>

          <main className={cn("flex-1 w-full md:px-5 md:py-6 lg:py-8", isConversationOpen ? "p-0" : "px-5 py-4")}>
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
      </div>

      {/* Bottom Navigation Mobile */}
      <BottomNav />
    </div>
  );
}
