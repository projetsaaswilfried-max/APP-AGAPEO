import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Users, UserCheck, MessageSquare, Flag, ShieldCheck, FlaskConical, Heart, FileText, Crown, Receipt } from "lucide-react";

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: testAccounts },
    { count: suspendedUsers },
    { count: newUsers7d },
    { count: newUsers30d },
    { count: totalMessages },
    { count: totalConversations },
    { count: pendingReports },
    { count: pendingVerifications },
    { count: totalPersonalPosts },
    { count: totalOfficialPosts },
    { count: totalFavorites },
    { count: premiumUsers },
    { count: transactionsCount }
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_test_account", false),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_test_account", true),
    admin.from("profile_restricted").select("id", { count: "exact", head: true }).eq("is_suspended", true),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_test_account", false).gte("created_at", daysAgoIso(7)),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_test_account", false).gte("created_at", daysAgoIso(30)),
    admin.from("messages").select("id", { count: "exact", head: true }),
    admin.from("conversations").select("id", { count: "exact", head: true }),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("photo_verification_status", "PENDING"),
    admin.from("posts").select("id", { count: "exact", head: true }).eq("post_type", "PERSONAL"),
    admin.from("posts").select("id", { count: "exact", head: true }).eq("post_type", "OFFICIAL"),
    admin.from("favorites").select("id", { count: "exact", head: true }),
    admin.from("profile_restricted").select("id", { count: "exact", head: true }).eq("subscription_status", "ACTIVE"),
    admin.from("transactions").select("id", { count: "exact", head: true })
  ]);

  const stats = [
    { label: "Membres réels", value: totalUsers ?? 0, icon: Users, accent: false },
    { label: "Nouveaux (7 jours)", value: newUsers7d ?? 0, icon: UserCheck, accent: false },
    { label: "Nouveaux (30 jours)", value: newUsers30d ?? 0, icon: UserCheck, accent: false },
    { label: "Comptes suspendus", value: suspendedUsers ?? 0, icon: ShieldCheck, accent: (suspendedUsers ?? 0) > 0 },
    { label: "Signalements en attente", value: pendingReports ?? 0, icon: Flag, accent: (pendingReports ?? 0) > 0 },
    { label: "Vérifications en attente", value: pendingVerifications ?? 0, icon: ShieldCheck, accent: (pendingVerifications ?? 0) > 0 },
    { label: "Conversations", value: totalConversations ?? 0, icon: MessageSquare, accent: false },
    { label: "Messages envoyés", value: totalMessages ?? 0, icon: MessageSquare, accent: false },
    { label: "Publications personnelles", value: totalPersonalPosts ?? 0, icon: FileText, accent: false },
    { label: "Publications officielles", value: totalOfficialPosts ?? 0, icon: FileText, accent: false },
    { label: "Favoris ajoutés", value: totalFavorites ?? 0, icon: Heart, accent: false },
    { label: "Abonnés premium", value: premiumUsers ?? 0, icon: Crown, accent: false },
    { label: "Transactions enregistrées", value: transactionsCount ?? 0, icon: Receipt, accent: false },
    { label: "Profils de test", value: testAccounts ?? 0, icon: FlaskConical, accent: (testAccounts ?? 0) > 0 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
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
