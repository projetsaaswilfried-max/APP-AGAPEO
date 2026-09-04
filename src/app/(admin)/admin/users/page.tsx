import { createAdminClient, listAllAuthUsers, fetchAllRows } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/supabase/session";
import { AdminUsersTable, type AdminUserRow } from "@/components/features/admin/admin-users-table";
import type { ProfileRow, ProfileRestrictedRow } from "@/lib/supabase/database.types";

export default async function AdminUsersPage() {
  await requireAdminSession();
  const admin = createAdminClient();

  const [profiles, restricted, authUsers] = await Promise.all([
    fetchAllRows<ProfileRow>((from, to) => admin.from("profiles").select("*").order("created_at", { ascending: false }).range(from, to)),
    fetchAllRows<ProfileRestrictedRow>((from, to) => admin.from("profile_restricted").select("*").range(from, to)),
    listAllAuthUsers(admin)
  ]);

  const emailById = new Map(authUsers.map((u) => [u.id, u.email ?? ""]));
  const restrictedById = new Map(restricted.map((r) => [r.id, r]));

  const rows: AdminUserRow[] = profiles.map((p) => {
    const r = restrictedById.get(p.id);
    return {
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      email: emailById.get(p.id) ?? "",
      role: r?.role ?? "USER",
      isTestAccount: p.is_test_account,
      isSuspended: r?.is_suspended ?? false,
      isPremium: r?.subscription_status === "ACTIVE",
      subscriptionPlan: r?.subscription_plan ?? null,
      photoVerificationStatus: p.photo_verification_status,
      country: p.country,
      createdAt: p.created_at,
      lastActiveAt: p.last_active_at
    };
  });

  return <AdminUsersTable initialUsers={rows} />;
}
