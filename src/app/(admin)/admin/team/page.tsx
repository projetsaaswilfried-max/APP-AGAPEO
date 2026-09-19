import { createAdminClient, listAllAuthUsers } from "@/lib/supabase/admin";
import { requireStaffSession } from "@/lib/supabase/session";
import { AdminTeamTable, type AdminTeamMemberRow } from "@/components/features/admin/admin-team-table";
import type { ProfileRow, ProfileRestrictedRow } from "@/lib/supabase/database.types";

// Roster de l'équipe (MODERATOR/ADMIN/SUPER_ADMIN) — visible à tout le staff
// (requireStaffSession, comme le reste de la coquille (admin)), le contrôle
// de rôle lui-même reste réservé au SUPER_ADMIN courant (cf. AdminTeamTable).
export default async function AdminTeamPage() {
  const { profile: viewer } = await requireStaffSession();
  const admin = createAdminClient();

  const { data: restricted } = await admin
    .from("profile_restricted")
    .select("*")
    .neq("role", "USER")
    .returns<ProfileRestrictedRow[]>();

  const staffIds = (restricted ?? []).map((r) => r.id);
  if (staffIds.length === 0) {
    return <AdminTeamTable initialMembers={[]} viewerRole={viewer.role} viewerId={viewer.id} />;
  }

  const [{ data: profiles }, authUsers] = await Promise.all([
    admin.from("profiles").select("*").in("id", staffIds).returns<ProfileRow[]>(),
    listAllAuthUsers(admin)
  ]);

  const emailById = new Map(authUsers.map((u) => [u.id, u.email ?? ""]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const members: AdminTeamMemberRow[] = (restricted ?? [])
    .map((r) => {
      const p = profileById.get(r.id);
      if (!p) return null;
      return {
        id: r.id,
        firstName: p.first_name,
        lastName: p.last_name,
        email: emailById.get(r.id) ?? "",
        avatarUrl: p.avatar_url,
        role: r.role,
        photoVerificationStatus: p.photo_verification_status,
        joinedAt: p.created_at
      };
    })
    .filter((m): m is AdminTeamMemberRow => m !== null)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

  return <AdminTeamTable initialMembers={members} viewerRole={viewer.role} viewerId={viewer.id} />;
}
