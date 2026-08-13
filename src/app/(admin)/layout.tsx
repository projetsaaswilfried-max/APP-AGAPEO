import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/core/providers/session-provider";
import { requireSuperAdminSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTabsNav } from "@/components/features/admin/admin-tabs-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireSuperAdminSession();

  const admin = createAdminClient();
  const [{ count: pendingReports }, { count: pendingVerifications }, { count: openTickets }] = await Promise.all([
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    admin.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    admin.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "OPEN")
  ]);

  return (
    <SessionProvider user={user} profile={profile}>
      <AppShell>
        <div className="space-y-6 w-full pb-16 select-none">
          <div className="border-b border-border/60 pb-4">
            <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">Espace Administrateur</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Pilotage de la plateforme — réservé au super administrateur.</p>
          </div>
          <AdminTabsNav
            badgeCounts={{ reports: pendingReports ?? 0, verifications: pendingVerifications ?? 0, support: openTickets ?? 0 }}
          />
          {children}
        </div>
      </AppShell>
    </SessionProvider>
  );
}
