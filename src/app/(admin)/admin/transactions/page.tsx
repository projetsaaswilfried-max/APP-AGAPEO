import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/supabase/session";
import { AdminTransactionsList, type AdminTransactionRow } from "@/components/features/admin/admin-transactions-list";
import type { TransactionRow } from "@/lib/supabase/database.types";

export default async function AdminTransactionsPage() {
  await requireAdminSession();
  const admin = createAdminClient();

  const { data: transactions } = await admin.from("transactions").select("*").order("created_at", { ascending: false }).limit(1000);
  const rows = (transactions ?? []) as TransactionRow[];

  const userIds = [...new Set(rows.map((t) => t.user_id))];
  const { data: profiles } = userIds.length > 0 ? await admin.from("profiles").select("id, first_name, last_name").in("id", userIds) : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name ?? ""}`.trim()]));

  const items: AdminTransactionRow[] = rows.map((t) => ({
    id: t.id,
    userName: nameById.get(t.user_id) ?? "Membre supprimé",
    amountCents: t.amount_cents,
    currency: t.currency,
    status: t.status,
    plan: t.plan,
    provider: t.provider,
    createdAt: t.created_at
  }));

  return <AdminTransactionsList transactions={items} />;
}
