import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/supabase/session";
import { fetchAdminUsersPage } from "@/lib/admin-users-query";
import { AdminUsersTable } from "@/components/features/admin/admin-users-table";

export default async function AdminUsersPage() {
  await requireAdminSession();
  const admin = createAdminClient();

  const rows = await fetchAdminUsersPage(admin, 0);

  return <AdminUsersTable initialUsers={rows} />;
}
