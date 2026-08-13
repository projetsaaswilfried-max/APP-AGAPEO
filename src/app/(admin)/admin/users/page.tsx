import { createAdminClient } from "@/lib/supabase/admin";
import { AdminUsersTable, type AdminUserRow } from "@/components/features/admin/admin-users-table";
import type { ProfileRow, ProfileRestrictedRow } from "@/lib/supabase/database.types";

export default async function AdminUsersPage() {
  const admin = createAdminClient();

  const [{ data: profiles }, { data: restricted }, { data: usersPage }] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }),
    admin.from("profile_restricted").select("*"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);

  const emailById = new Map(usersPage?.users.map((u) => [u.id, u.email ?? ""]) ?? []);
  const restrictedById = new Map(((restricted ?? []) as ProfileRestrictedRow[]).map((r) => [r.id, r]));

  const rows: AdminUserRow[] = ((profiles ?? []) as ProfileRow[]).map((p) => {
    const r = restrictedById.get(p.id);
    return {
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      email: emailById.get(p.id) ?? "",
      role: r?.role ?? "USER",
      isTestAccount: p.is_test_account,
      isSuspended: r?.is_suspended ?? false,
      photoVerificationStatus: p.photo_verification_status,
      country: p.country,
      createdAt: p.created_at,
      lastActiveAt: p.last_active_at
    };
  });

  return <AdminUsersTable initialUsers={rows} />;
}
