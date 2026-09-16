"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
  createPlatformDeductionAction,
  updatePlatformDeductionAction,
  deletePlatformDeductionAction
} from "@/lib/actions/finance.actions";
import { TrendingUp, TrendingDown, Wallet, Plus, Pencil, Trash2, AlertTriangle, Receipt, Landmark, Equal } from "lucide-react";

export interface FinanceRevenueEntry {
  id: string;
  amountCents: number;
  currency: string;
  /** `null` si aucun taux de change n'était disponible pour cette devise — exclu du total plutôt que d'afficher un chiffre approximatif. */
  usdAmountCents: number | null;
  date: string;
  plan: string | null;
  provider: string | null;
}

export interface FinanceExpenseRow {
  id: string;
  label: string;
  category: string;
  amountCents: number;
  date: string;
  note: string | null;
}

export interface FinanceDeductionRow {
  id: string;
  provider: string;
  amountCents: number;
  date: string;
  note: string | null;
}

const EXPENSE_CATEGORIES = ["Salaires & prestataires", "Infrastructure & outils", "Marketing & acquisition", "Frais bancaires & paiement", "Légal & administratif", "Autre"];
const DEDUCTION_PROVIDERS = ["Chariow", "SasPay", "Autre"];

type RangePreset = "MONTH" | "30D" | "ALL" | "CUSTOM";

const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function formatUsd(cents: number): string {
  return usdFormatter.format(cents / 100);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

interface ExpenseFormState {
  label: string;
  category: string;
  amount: string;
  date: string;
  note: string;
}
interface DeductionFormState {
  provider: string;
  amount: string;
  date: string;
  note: string;
}

const EMPTY_EXPENSE_FORM: ExpenseFormState = { label: "", category: EXPENSE_CATEGORIES[0], amount: "", date: todayIso(), note: "" };
const EMPTY_DEDUCTION_FORM: DeductionFormState = { provider: DEDUCTION_PROVIDERS[0], amount: "", date: todayIso(), note: "" };

export function AdminFinancesView({
  revenueEntries,
  unconvertedRevenueCount,
  unconvertedRevenueCurrencies,
  initialExpenses,
  initialDeductions
}: {
  revenueEntries: FinanceRevenueEntry[];
  unconvertedRevenueCount: number;
  unconvertedRevenueCurrencies: string[];
  initialExpenses: FinanceExpenseRow[];
  initialDeductions: FinanceDeductionRow[];
}) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [deductions, setDeductions] = useState(initialDeductions);
  const [preset, setPreset] = useState<RangePreset>("MONTH");
  const [dateFrom, setDateFrom] = useState(startOfMonthIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(EMPTY_EXPENSE_FORM);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const [deductionFormOpen, setDeductionFormOpen] = useState(false);
  const [editingDeductionId, setEditingDeductionId] = useState<string | null>(null);
  const [deductionForm, setDeductionForm] = useState<DeductionFormState>(EMPTY_DEDUCTION_FORM);
  const [deleteDeductionId, setDeleteDeductionId] = useState<string | null>(null);

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    if (p === "MONTH") {
      setDateFrom(startOfMonthIso());
      setDateTo(todayIso());
    } else if (p === "30D") {
      setDateFrom(daysAgoIso(30));
      setDateTo(todayIso());
    } else if (p === "ALL") {
      setDateFrom("");
      setDateTo("");
    }
  };

  const filteredRevenue = useMemo(
    () =>
      revenueEntries.filter((r) => {
        const d = r.date.slice(0, 10);
        return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      }),
    [revenueEntries, dateFrom, dateTo]
  );
  const filteredDeductions = useMemo(
    () =>
      deductions
        .filter((d) => {
          const day = d.date.slice(0, 10);
          return (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo);
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [deductions, dateFrom, dateTo]
  );
  const filteredExpenses = useMemo(
    () =>
      expenses
        .filter((e) => {
          const d = e.date.slice(0, 10);
          return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, dateFrom, dateTo]
  );

  // Compte de résultat en cascade, comme un expert-comptable le présenterait :
  // CA encaissé -> (-) prélèvements des plateformes de paiement (connus
  // seulement au retrait réel, jamais via une API) -> solde net -> (-)
  // charges d'exploitation -> bénéfice net final.
  const totalRevenueUsdCents = filteredRevenue.reduce((sum, r) => sum + (r.usdAmountCents ?? 0), 0);
  const totalDeductionsUsdCents = filteredDeductions.reduce((sum, d) => sum + d.amountCents, 0);
  const netBalanceUsdCents = totalRevenueUsdCents - totalDeductionsUsdCents;
  const totalExpensesUsdCents = filteredExpenses.reduce((sum, e) => sum + e.amountCents, 0);
  const netProfitUsdCents = netBalanceUsdCents - totalExpensesUsdCents;

  const openCreateExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseForm(EMPTY_EXPENSE_FORM);
    setError(null);
    setExpenseFormOpen(true);
  };
  const openEditExpenseForm = (row: FinanceExpenseRow) => {
    setEditingExpenseId(row.id);
    setExpenseForm({ label: row.label, category: row.category, amount: (row.amountCents / 100).toFixed(2), date: row.date.slice(0, 10), note: row.note ?? "" });
    setError(null);
    setExpenseFormOpen(true);
  };
  const handleSubmitExpense = () => {
    setError(null);
    const amount = Number(expenseForm.amount.replace(",", "."));
    if (!expenseForm.label.trim() || !Number.isFinite(amount) || amount <= 0 || !expenseForm.date) {
      setError("Renseigne un libellé, un montant positif et une date.");
      return;
    }
    const payload = { label: expenseForm.label.trim(), category: expenseForm.category, amountCents: Math.round(amount * 100), expenseDate: expenseForm.date, note: expenseForm.note.trim() || undefined };
    startTransition(async () => {
      const result = editingExpenseId ? await updateExpenseAction(editingExpenseId, payload) : await createExpenseAction(payload);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (editingExpenseId) {
        setExpenses((prev) => prev.map((e) => (e.id === editingExpenseId ? { ...e, ...payload, date: payload.expenseDate, note: payload.note ?? null } : e)));
      } else {
        setExpenses((prev) => [{ id: `optimistic-${Date.now()}`, label: payload.label, category: payload.category, amountCents: payload.amountCents, date: payload.expenseDate, note: payload.note ?? null }, ...prev]);
      }
      setExpenseFormOpen(false);
    });
  };
  const handleConfirmDeleteExpense = () => {
    if (!deleteExpenseId) return;
    const id = deleteExpenseId;
    setDeleteExpenseId(null);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    startTransition(async () => {
      const result = await deleteExpenseAction(id);
      if (result?.error) setError(result.error);
    });
  };

  const openCreateDeductionForm = () => {
    setEditingDeductionId(null);
    setDeductionForm(EMPTY_DEDUCTION_FORM);
    setError(null);
    setDeductionFormOpen(true);
  };
  const openEditDeductionForm = (row: FinanceDeductionRow) => {
    setEditingDeductionId(row.id);
    setDeductionForm({ provider: row.provider, amount: (row.amountCents / 100).toFixed(2), date: row.date.slice(0, 10), note: row.note ?? "" });
    setError(null);
    setDeductionFormOpen(true);
  };
  const handleSubmitDeduction = () => {
    setError(null);
    const amount = Number(deductionForm.amount.replace(",", "."));
    if (!deductionForm.provider.trim() || !Number.isFinite(amount) || amount <= 0 || !deductionForm.date) {
      setError("Renseigne une plateforme, un montant positif et une date.");
      return;
    }
    const payload = { provider: deductionForm.provider.trim(), amountCents: Math.round(amount * 100), deductionDate: deductionForm.date, note: deductionForm.note.trim() || undefined };
    startTransition(async () => {
      const result = editingDeductionId ? await updatePlatformDeductionAction(editingDeductionId, payload) : await createPlatformDeductionAction(payload);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (editingDeductionId) {
        setDeductions((prev) => prev.map((d) => (d.id === editingDeductionId ? { ...d, provider: payload.provider, amountCents: payload.amountCents, date: payload.deductionDate, note: payload.note ?? null } : d)));
      } else {
        setDeductions((prev) => [{ id: `optimistic-${Date.now()}`, provider: payload.provider, amountCents: payload.amountCents, date: payload.deductionDate, note: payload.note ?? null }, ...prev]);
      }
      setDeductionFormOpen(false);
    });
  };
  const handleConfirmDeleteDeduction = () => {
    if (!deleteDeductionId) return;
    const id = deleteDeductionId;
    setDeleteDeductionId(null);
    setDeductions((prev) => prev.filter((d) => d.id !== id));
    startTransition(async () => {
      const result = await deletePlatformDeductionAction(id);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1 p-1 bg-secondary/60 rounded-xl border border-border/40 w-fit">
        {([
          ["MONTH", "Ce mois"],
          ["30D", "30 derniers jours"],
          ["ALL", "Tout"]
        ] as [RangePreset, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
              preset === key ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 pl-2 pr-1">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setPreset("CUSTOM");
              setDateFrom(e.target.value);
            }}
            className="text-xs h-8 bg-card border border-border/60 rounded-lg px-2 text-foreground"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setPreset("CUSTOM");
              setDateTo(e.target.value);
            }}
            className="text-xs h-8 bg-card border border-border/60 rounded-lg px-2 text-foreground"
          />
        </div>
      </div>

      {unconvertedRevenueCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle size={14} className="shrink-0" />
          {unconvertedRevenueCount} transaction(s) en {unconvertedRevenueCurrencies.join(", ")} non incluse(s) dans le CA — taux de change indisponible pour le moment.
        </div>
      )}
      {error && <p className="text-xs text-destructive px-1">{error}</p>}

      {/* Compte de résultat en cascade — un "sheet" unique du CA encaissé jusqu'au bénéfice net, comme un relevé comptable. */}
      <div className="border border-border/60 rounded-3xl overflow-hidden bg-card shadow-soft divide-y divide-border/60">
        {/* Chiffre d'affaires */}
        <div className="p-5 space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
            <TrendingUp size={13} /> Chiffre d&apos;affaires encaissé
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-muted-foreground">{filteredRevenue.length} transaction(s) réussie(s)</p>
            <p className="text-2xl font-display font-semibold text-foreground font-mono tabular-nums">{formatUsd(totalRevenueUsdCents)}</p>
          </div>
        </div>

        {/* Prélèvements des plateformes de paiement */}
        <div className="p-5 space-y-3 bg-secondary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              <Landmark size={13} /> Prélèvements des plateformes de paiement
            </div>
            <Button variant="outline" size="sm" onClick={openCreateDeductionForm} leftIcon={<Plus size={13} />}>
              Ajouter un prélèvement
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Chariow/SasPay prélèvent un pourcentage au retrait, jamais communiqué à l&apos;avance — à renseigner ici une fois constaté sur le relevé réel.
          </p>

          {filteredDeductions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">Aucun prélèvement renseigné sur cette période.</p>
          ) : (
            <div className="border border-border/60 rounded-2xl overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-left">
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Plateforme</th>
                      <th className="px-4 py-2 font-medium">Note</th>
                      <th className="px-4 py-2 font-medium text-right">Montant</th>
                      <th className="px-4 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeductions.map((d) => (
                      <tr key={d.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30">
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{new Date(d.date).toLocaleDateString("fr-FR")}</td>
                        <td className="px-4 py-2 font-medium text-foreground">{d.provider}</td>
                        <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{d.note ?? "—"}</td>
                        <td className="px-4 py-2 text-right font-medium text-destructive font-mono tabular-nums whitespace-nowrap">−{formatUsd(d.amountCents)}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => openEditDeductionForm(d)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary" title="Modifier">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeleteDeductionId(d.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10" title="Supprimer">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-xs font-semibold text-foreground">
            <span>Total prélevé</span>
            <span className="font-mono tabular-nums text-destructive">−{formatUsd(totalDeductionsUsdCents)}</span>
          </div>
        </div>

        {/* Solde net après prélèvements */}
        <div className="px-5 py-4 bg-secondary/50 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Equal size={14} /> Solde net après prélèvements
          </span>
          <span className="text-lg font-display font-semibold text-foreground font-mono tabular-nums">{formatUsd(netBalanceUsdCents)}</span>
        </div>

        {/* Charges d'exploitation */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              <TrendingDown size={13} /> Charges d&apos;exploitation
            </div>
            <Button variant="outline" size="sm" onClick={openCreateExpenseForm} leftIcon={<Plus size={13} />}>
              Ajouter une charge
            </Button>
          </div>

          {filteredExpenses.length === 0 ? (
            <EmptyState icon={<Receipt size={20} />} title="Aucune charge sur cette période" description="Ajoute une ligne pour commencer à suivre les charges de la plateforme." />
          ) : (
            <div className="border border-border/60 rounded-2xl overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-left">
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Catégorie</th>
                      <th className="px-4 py-2 font-medium">Libellé</th>
                      <th className="px-4 py-2 font-medium">Note</th>
                      <th className="px-4 py-2 font-medium text-right">Montant</th>
                      <th className="px-4 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((e) => (
                      <tr key={e.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30">
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                        <td className="px-4 py-2 text-muted-foreground">{e.category}</td>
                        <td className="px-4 py-2 font-medium text-foreground">{e.label}</td>
                        <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{e.note ?? "—"}</td>
                        <td className="px-4 py-2 text-right font-medium text-destructive font-mono tabular-nums whitespace-nowrap">−{formatUsd(e.amountCents)}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => openEditExpenseForm(e)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary" title="Modifier">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeleteExpenseId(e.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10" title="Supprimer">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-xs font-semibold text-foreground">
            <span>Total charges</span>
            <span className="font-mono tabular-nums text-destructive">−{formatUsd(totalExpensesUsdCents)}</span>
          </div>
        </div>

        {/* Bénéfice net final */}
        <div className={`px-5 py-6 flex items-center justify-between border-t-4 border-double ${netProfitUsdCents >= 0 ? "bg-emerald-500/10 border-emerald-500/40" : "bg-destructive/10 border-destructive/40"}`}>
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Wallet size={16} /> Bénéfice net
          </span>
          <span className={`text-2xl font-display font-bold font-mono tabular-nums ${netProfitUsdCents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
            {netProfitUsdCents >= 0 ? "+" : ""}
            {formatUsd(netProfitUsdCents)}
          </span>
        </div>
      </div>

      {/* Formulaire dépense */}
      <Modal
        isOpen={expenseFormOpen}
        onClose={() => setExpenseFormOpen(false)}
        title={editingExpenseId ? "Modifier la charge" : "Ajouter une charge"}
        maxWidth="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setExpenseFormOpen(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmitExpense} isLoading={isPending}>
              {editingExpenseId ? "Enregistrer" : "Ajouter"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Libellé</label>
            <input
              value={expenseForm.label}
              onChange={(e) => setExpenseForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Ex : Hébergement Supabase — septembre"
              className="w-full h-10 rounded-xl border border-border/60 bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Catégorie</label>
              <Select value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} className="w-full">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Date</label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full h-10 rounded-xl border border-border/60 bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Montant (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                inputMode="decimal"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Ex : 45.00"
                className="w-full h-10 rounded-xl border border-border/60 bg-secondary/50 pl-7 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Note (optionnel)</label>
            <textarea
              value={expenseForm.note}
              onChange={(e) => setExpenseForm((f) => ({ ...f, note: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-border/60 bg-secondary/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteExpenseId)}
        onClose={() => setDeleteExpenseId(null)}
        title="Supprimer cette charge ?"
        description="Cette action est définitive."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteExpenseId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDeleteExpense} leftIcon={<Trash2 size={14} />}>
              Supprimer
            </Button>
          </>
        }
      >
        <></>
      </Modal>

      {/* Formulaire prélèvement */}
      <Modal
        isOpen={deductionFormOpen}
        onClose={() => setDeductionFormOpen(false)}
        title={editingDeductionId ? "Modifier le prélèvement" : "Ajouter un prélèvement"}
        maxWidth="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeductionFormOpen(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmitDeduction} isLoading={isPending}>
              {editingDeductionId ? "Enregistrer" : "Ajouter"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Plateforme</label>
              <Select value={deductionForm.provider} onChange={(e) => setDeductionForm((f) => ({ ...f, provider: e.target.value }))} className="w-full">
                {DEDUCTION_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Date</label>
              <input
                type="date"
                value={deductionForm.date}
                onChange={(e) => setDeductionForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full h-10 rounded-xl border border-border/60 bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Montant prélevé (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                inputMode="decimal"
                value={deductionForm.amount}
                onChange={(e) => setDeductionForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Ex : 62.50"
                className="w-full h-10 rounded-xl border border-border/60 bg-secondary/50 pl-7 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Note (optionnel)</label>
            <textarea
              value={deductionForm.note}
              onChange={(e) => setDeductionForm((f) => ({ ...f, note: e.target.value }))}
              rows={2}
              placeholder="Ex : Retrait du 12/09, relevé Chariow"
              className="w-full rounded-xl border border-border/60 bg-secondary/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteDeductionId)}
        onClose={() => setDeleteDeductionId(null)}
        title="Supprimer ce prélèvement ?"
        description="Cette action est définitive."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteDeductionId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDeleteDeduction} leftIcon={<Trash2 size={14} />}>
              Supprimer
            </Button>
          </>
        }
      >
        <></>
      </Modal>
    </div>
  );
}
