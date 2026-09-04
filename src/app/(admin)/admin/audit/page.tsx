import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminSession } from "@/lib/supabase/session";
import type { AdminAuditLogRow } from "@/lib/supabase/database.types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollText } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  UPDATE_USER_ROLE: "Changement de rôle",
  SUSPEND_USER: "Suspension de compte",
  UNSUSPEND_USER: "Réactivation de compte",
  UPDATE_PHOTO_VERIFICATION: "Vérification photo",
  UPDATE_REPORT_STATUS: "Signalement traité",
  SEND_EMAIL_CAMPAIGN: "Campagne email envoyée",
  SCHEDULE_EMAIL_CAMPAIGN: "Campagne email programmée",
  CANCEL_EMAIL_CAMPAIGN: "Campagne email annulée",
  SWITCH_PAYMENT_PROVIDER: "Changement de processeur de paiement"
};

export default async function AdminAuditPage() {
  await requireSuperAdminSession();
  const admin = createAdminClient();

  const { data: logs } = await admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200);
  const rows = (logs ?? []) as AdminAuditLogRow[];

  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: actors } = actorIds.length > 0 ? await admin.from("profiles").select("id, first_name, last_name").in("id", actorIds) : { data: [] };
  const nameById = new Map((actors ?? []).map((a) => [a.id, `${a.first_name} ${a.last_name ?? ""}`.trim()]));

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ScrollText size={22} />}
        title="Aucune action enregistrée"
        description="Chaque action de modération ou d'administration (rôle, suspension, vérification, signalement, campagne email) apparaîtra ici."
      />
    );
  }

  return (
    <div className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground text-left">
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Par</th>
              <th className="px-4 py-2.5 font-medium">Détails</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((log) => (
              <tr key={log.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30">
                <td className="px-4 py-2.5">
                  <Badge variant="status" className="text-[10px]">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 font-medium text-foreground">{log.actor_id ? nameById.get(log.actor_id) ?? "Admin" : "Système"}</td>
                <td className="px-4 py-2.5 text-muted-foreground font-mono text-[11px]">
                  {log.details ? JSON.stringify(log.details) : "—"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
