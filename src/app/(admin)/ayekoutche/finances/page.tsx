import { createAdminClient, fetchAllRows } from "@/lib/supabase/admin";
import { requireSuperAdminSession } from "@/lib/supabase/session";
import { buildUsdConverter } from "@/lib/finance/revenue";
import {
  AdminFinancesView,
  type FinanceDeductionRow,
  type FinanceExpenseRow,
  type FinanceRevenueEntry
} from "@/components/features/admin/admin-finances-view";
import type { ExpenseRow, PlatformDeductionRow, TransactionRow } from "@/lib/supabase/database.types";

// Réservé SUPER_ADMIN (cf. décision produit) : les chiffres réels de revenus
// et de charges restent parmi les seules pages de tout l'espace équipe
// invisibles aux ADMIN/MODERATOR, au même titre que Paiements/Journal d'audit.
export default async function AdminFinancesPage() {
  await requireSuperAdminSession();
  const admin = createAdminClient();

  const [expenses, deductions, succeededTransactions, testAccounts] = await Promise.all([
    fetchAllRows<ExpenseRow>((from, to) => admin.from("expenses").select("*").order("expense_date", { ascending: false }).range(from, to)),
    fetchAllRows<PlatformDeductionRow>((from, to) =>
      admin.from("platform_deductions").select("*").order("period_end", { ascending: false }).range(from, to)
    ),
    fetchAllRows<TransactionRow>((from, to) =>
      admin.from("transactions").select("*").eq("status", "SUCCEEDED").order("created_at", { ascending: false }).range(from, to)
    ),
    admin.from("profiles").select("id").eq("is_test_account", true)
  ]);

  // Le chiffre d'affaires réel exclut les achats effectués depuis un compte
  // de test (is_test_account) — sans quoi les paiements de QA/vérification
  // en conditions réelles gonfleraient artificiellement le "vrai" revenu.
  const testAccountIds = new Set((testAccounts.data ?? []).map((p: { id: string }) => p.id));
  const realTransactions = succeededTransactions.filter((t) => !testAccountIds.has(t.user_id));

  const toUsdCents = await buildUsdConverter(admin, realTransactions.map((t) => t.currency));

  const revenueEntries: FinanceRevenueEntry[] = realTransactions.map((t) => ({
    id: t.id,
    amountCents: t.amount_cents,
    currency: t.currency,
    usdAmountCents: toUsdCents(t.amount_cents, t.currency),
    date: t.created_at,
    plan: t.plan,
    provider: t.provider
  }));

  const unconvertedEntries = revenueEntries.filter((r) => r.usdAmountCents === null);
  const unconvertedCount = unconvertedEntries.length;
  const unconvertedCurrencies = new Set(unconvertedEntries.map((r) => r.currency));

  const expenseRows: FinanceExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    label: e.label,
    category: e.category,
    amountCents: e.amount_cents,
    date: e.expense_date,
    note: e.note
  }));

  const deductionRows: FinanceDeductionRow[] = deductions.map((d) => ({
    id: d.id,
    provider: d.provider,
    amountCents: d.amount_cents,
    periodStart: d.period_start,
    periodEnd: d.period_end,
    note: d.note
  }));

  return (
    <AdminFinancesView
      revenueEntries={revenueEntries}
      unconvertedRevenueCount={unconvertedCount}
      unconvertedRevenueCurrencies={[...unconvertedCurrencies]}
      initialExpenses={expenseRows}
      initialDeductions={deductionRows}
    />
  );
}
