import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/supabase/session";
import { AdminInterestsTable } from "@/components/features/admin/admin-interests-table";
import type { InterestRow } from "@/lib/supabase/database.types";

export default async function AdminInterestsPage() {
  await requireAdminSession();
  const admin = createAdminClient();

  const { data } = await admin.from("interests").select("*").order("name", { ascending: true }).returns<InterestRow[]>();

  return <AdminInterestsTable initialInterests={data ?? []} />;
}
