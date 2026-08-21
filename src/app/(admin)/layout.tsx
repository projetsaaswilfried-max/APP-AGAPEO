import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/core/providers/session-provider";
import { requireStaffSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTabsNav } from "@/components/features/admin/admin-tabs-nav";

// Espace administrateur : jamais indexé.
export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

const SPACE_LABELS = {
  MODERATOR: { title: "Espace Modération", description: "Signalements, support et vérifications de profil." },
  ADMIN: { title: "Espace Administrateur", description: "Pilotage de la plateforme." },
  SUPER_ADMIN: { title: "Espace Administrateur", description: "Pilotage complet de la plateforme." }
} as const;

// Ouvert à MODERATOR/ADMIN/SUPER_ADMIN — chaque page sous /admin applique
// ensuite sa propre restriction plus stricte si besoin (ADMIN+ ou
// SUPER_ADMIN uniquement) ; AdminTabsNav n'affiche que les onglets
// atteignables par le rôle courant.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireStaffSession();
  const space = SPACE_LABELS[profile.role as keyof typeof SPACE_LABELS] ?? SPACE_LABELS.MODERATOR;

  const admin = createAdminClient();
  const [{ count: pendingReports }, { count: pendingVerifications }, { count: openTickets }] = await Promise.all([
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    admin.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    admin.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "OPEN")
  ]);

  return (
    <SessionProvider user={user} profile={profile}>
      <AppShell>
        <div className="space-y-6 w-full pb-16 select-none overflow-x-hidden">
          <div className="border-b border-border/60 pb-4">
            <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">{space.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{space.description}</p>
          </div>
          <AdminTabsNav
            role={profile.role}
            badgeCounts={{ reports: pendingReports ?? 0, verifications: pendingVerifications ?? 0, support: openTickets ?? 0 }}
          />
          {children}
        </div>
      </AppShell>
    </SessionProvider>
  );
}
