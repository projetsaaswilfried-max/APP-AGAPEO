import { createAdminClient } from "@/lib/supabase/admin";
import { AdminReportsList, type AdminReportRow } from "@/components/features/admin/admin-reports-list";
import type { ReportRow } from "@/lib/supabase/database.types";

export default async function AdminReportsPage() {
  const admin = createAdminClient();

  const { data: reports } = await admin.from("reports").select("*").order("created_at", { ascending: false });
  const rows = (reports ?? []) as ReportRow[];

  const profileIds = [...new Set([...rows.map((r) => r.reporter_id), ...rows.filter((r) => r.target_type === "PROFILE").map((r) => r.target_id)])];

  const { data: profiles } = profileIds.length > 0 ? await admin.from("profiles").select("id, first_name, last_name").in("id", profileIds) : { data: [] };
  const profilesById = new Map((profiles ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name ?? ""}`.trim()]));

  const items: AdminReportRow[] = rows.map((r) => ({
    id: r.id,
    reporterName: profilesById.get(r.reporter_id) ?? "Membre supprimé",
    targetType: r.target_type,
    targetId: r.target_id,
    targetName: r.target_type === "PROFILE" ? profilesById.get(r.target_id) : undefined,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.created_at
  }));

  return <AdminReportsList initialReports={items} />;
}
