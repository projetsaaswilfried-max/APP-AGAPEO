import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { AdminOverviewActivity } from "@/components/features/admin/admin-overview-activity";
import { Users, ShieldCheck, Flag, FlaskConical, Crown } from "lucide-react";

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: testAccounts },
    { count: suspendedUsers },
    { count: pendingReports },
    { count: pendingVerifications },
    { count: premiumUsers },
    { data: newUsers },
    { data: messages },
    { data: conversations },
    { data: personalPosts },
    { data: officialPosts },
    { data: favorites },
    { data: transactions },
    { data: onboardingEventsRaw },
    { data: testAccountRows }
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_test_account", false),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_test_account", true),
    admin.from("profile_restricted").select("id", { count: "exact", head: true }).eq("is_suspended", true),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("photo_verification_status", "PENDING"),
    admin.from("profile_restricted").select("id", { count: "exact", head: true }).eq("subscription_status", "ACTIVE"),
    // Horodatages bruts (pas de count:head) : nécessaires au filtrage par
    // date choisie côté client, cf. AdminOverviewActivity — même pattern que
    // AdminTransactionsList, volumes actuels compatibles avec un filtrage
    // en mémoire (quelques dizaines de lignes par table).
    admin.from("profiles").select("created_at, gender").eq("is_test_account", false),
    admin.from("messages").select("created_at"),
    admin.from("conversations").select("created_at"),
    admin.from("posts").select("created_at").eq("post_type", "PERSONAL"),
    admin.from("posts").select("created_at").eq("post_type", "OFFICIAL"),
    admin.from("favorites").select("created_at"),
    admin.from("transactions").select("created_at"),
    admin.from("onboarding_events").select("user_id, event_type, step_key, created_at"),
    admin.from("profiles").select("id").eq("is_test_account", true)
  ]);

  const testAccountIds = new Set((testAccountRows ?? []).map((p) => p.id));
  const onboardingEvents = (onboardingEventsRaw ?? []).filter((e) => !testAccountIds.has(e.user_id));

  const currentStats = [
    { label: "Membres réels", value: totalUsers ?? 0, icon: Users, accent: false },
    { label: "Comptes suspendus", value: suspendedUsers ?? 0, icon: ShieldCheck, accent: (suspendedUsers ?? 0) > 0 },
    { label: "Signalements en attente", value: pendingReports ?? 0, icon: Flag, accent: (pendingReports ?? 0) > 0 },
    { label: "Vérifications en attente", value: pendingVerifications ?? 0, icon: ShieldCheck, accent: (pendingVerifications ?? 0) > 0 },
    { label: "Abonnés premium", value: premiumUsers ?? 0, icon: Crown, accent: false },
    { label: "Profils de test", value: testAccounts ?? 0, icon: FlaskConical, accent: (testAccounts ?? 0) > 0 }
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-sm font-display font-semibold text-foreground">État actuel</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {currentStats.map((stat) => (
            <Card key={stat.label} variant="base" className="p-4 border-border/60 shadow-2xs space-y-2">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-xl ${
                  stat.accent ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
                }`}
              >
                <stat.icon size={17} />
              </div>
              <p className="text-2xl font-display font-semibold text-foreground tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground leading-snug">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-display font-semibold text-foreground">Activité sur la période</h2>
        <AdminOverviewActivity
          newUsers={newUsers ?? []}
          messages={messages ?? []}
          conversations={conversations ?? []}
          personalPosts={personalPosts ?? []}
          officialPosts={officialPosts ?? []}
          favorites={favorites ?? []}
          transactions={transactions ?? []}
          onboardingEvents={onboardingEvents}
        />
      </div>

      {(testAccounts ?? 0) > 0 && (
        <Card variant="base" className="p-4 border-amber-500/30 bg-amber-500/5 shadow-2xs">
          <p className="text-xs text-foreground">
            <strong>{testAccounts} profil(s) fictif(s)</strong> sont présents dans la base pour les besoins des tests (Découvrir,
            messagerie). Pense à exécuter <code className="px-1 py-0.5 rounded bg-secondary font-mono text-[11px]">npx tsx scripts/delete-test-profiles.ts</code> avant
            le lancement public.
          </p>
        </Card>
      )}
    </div>
  );
}
