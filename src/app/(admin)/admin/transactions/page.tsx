import { createAdminClient, fetchAllRows, fetchRowsByIds } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/supabase/session";
import { AdminTransactionsList, type AdminTransactionRow } from "@/components/features/admin/admin-transactions-list";
import type { TransactionRow } from "@/lib/supabase/database.types";

export default async function AdminTransactionsPage() {
  await requireAdminSession();
  const admin = createAdminClient();

  // fetchAllRows, pas un .limit(1000) : au-delà de 1000 transactions, un
  // simple .limit() tronquerait silencieusement la liste aux plus récentes,
  // même bug de fond que celui déjà corrigé sur /admin/users (cf.
  // commentaire de fetchAllRows dans lib/supabase/admin.ts).
  const rows = await fetchAllRows<TransactionRow>((from, to) =>
    admin.from("transactions").select("*").order("created_at", { ascending: false }).range(from, to)
  );

  const userIds = [...new Set(rows.map((t) => t.user_id))];
  const profiles = await fetchRowsByIds(userIds, (batch) => admin.from("profiles").select("id, first_name, last_name").in("id", batch));
  const nameById = new Map(profiles.map((p) => [p.id, `${p.first_name} ${p.last_name ?? ""}`.trim()]));

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
