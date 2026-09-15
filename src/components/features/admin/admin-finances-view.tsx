"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { createExpenseAction, updateExpenseAction, deleteExpenseAction } from "@/lib/actions/finance.actions";
import { TrendingUp, TrendingDown, Wallet, Plus, Pencil, Trash2, AlertTriangle, Receipt } from "lucide-react";

export interface FinanceRevenueEntry {
  id: string;
  amountCents: number;
  currency: string;
  /** `null` si aucun taux de change n'était disponible pour cette devise — exclu du total plutôt que d'afficher un chiffre approximatif. */
  xofAmountCents: number | null;
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

const EXPENSE_CATEGORIES = ["Salaires & prestataires", "Infrastructure & outils", "Marketing & acquisition", "Frais bancaires & paiement", "Légal & administratif", "Autre"];

type RangePreset = "MONTH" | "30D" | "ALL" | "CUSTOM";

function formatXof(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(cents / 100)) + " FCFA";
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

const EMPTY_FORM: ExpenseFormState = { label: "", category: EXPENSE_CATEGORIES[0], amount: "", date: todayIso(), note: "" };

export function AdminFinancesView({
  revenueEntries,
  unconvertedRevenueCount,
  unconvertedRevenueCurrencies,
  initialExpenses
}: {
  revenueEntries: FinanceRevenueEntry[];
  unconvertedRevenueCount: number;
  unconvertedRevenueCurrencies: string[];
  initialExpenses: FinanceExpenseRow[];
}) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [preset, setPreset] = useState<RangePreset>("MONTH");
  const [dateFrom, setDateFrom] = useState(startOfMonthIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(EMPTY_FORM);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

  const totalRevenueXofCents = filteredRevenue.reduce((sum, r) => sum + (r.xofAmountCents ?? 0), 0);
  const totalExpensesXofCents = filteredExpenses.reduce((sum, e) => sum + e.amountCents, 0);
  const netProfitXofCents = totalRevenueXofCents - totalExpensesXofCents;

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  };

  const openEditForm = (row: FinanceExpenseRow) => {
    setEditingId(row.id);
    setForm({ label: row.label, category: row.category, amount: String(row.amountCents / 100), date: row.date.slice(0, 10), note: row.note ?? "" });
    setError(null);
    setFormOpen(true);
  };

  const handleSubmit = () => {
    setError(null);
    const amount = Number(form.amount.replace(",", "."));
    if (!form.label.trim() || !Number.isFinite(amount) || amount <= 0 || !form.date) {
      setError("Renseigne un libellé, un montant positif et une date.");
      return;
    }
    const payload = { label: form.label.trim(), category: form.category, amountCents: Math.round(amount * 100), expenseDate: form.date, note: form.note.trim() || undefined };

    startTransition(async () => {
      const result = editingId ? await updateExpenseAction(editingId, payload) : await createExpenseAction(payload);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (editingId) {
        setExpenses((prev) => prev.map((e) => (e.id === editingId ? { ...e, ...payload, amountCents: payload.amountCents, date: payload.expenseDate, note: payload.note ?? null } : e)));
      } else {
        setExpenses((prev) => [
          { id: `optimistic-${Date.now()}`, label: payload.label, category: payload.category, amountCents: payload.amountCents, date: payload.expenseDate, note: payload.note ?? null },
          ...prev
        ]);
      }
      setFormOpen(false);
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    startTransition(async () => {
      const result = await deleteExpenseAction(id);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl border border-border/40 w-fit">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1.5">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            <TrendingUp size={13} /> Chiffre d&apos;affaires
          </div>
          <p className="text-xl font-display font-semibold text-foreground tabular-nums">{formatXof(totalRevenueXofCents)}</p>
          <p className="text-[11px] text-muted-foreground">{filteredRevenue.length} transaction(s) réussie(s)</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1.5">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            <TrendingDown size={13} /> Dépenses
          </div>
          <p className="text-xl font-display font-semibold text-foreground tabular-nums">{formatXof(totalExpensesXofCents)}</p>
          <p className="text-[11px] text-muted-foreground">{filteredExpenses.length} ligne(s)</p>
        </div>
        <div className={`p-4 rounded-2xl border space-y-1.5 ${netProfitXofCents >= 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            <Wallet size={13} /> Bénéfice net
          </div>
          <p className={`text-xl font-display font-semibold tabular-nums ${netProfitXofCents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
            {netProfitXofCents >= 0 ? "+" : ""}
            {formatXof(netProfitXofCents)}
          </p>
          <p className="text-[11px] text-muted-foreground">CA − Dépenses, sur la période</p>
        </div>
      </div>

      {error && <p className="text-xs text-destructive px-1">{error}</p>}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-display font-semibold text-foreground tracking-tight">Registre des dépenses</h2>
        <Button variant="primary" size="sm" onClick={openCreateForm} leftIcon={<Plus size={14} />}>
          Ajouter une dépense
        </Button>
      </div>

      {filteredExpenses.length === 0 ? (
        <EmptyState icon={<Receipt size={20} />} title="Aucune dépense sur cette période" description="Ajoute une ligne pour commencer à suivre les charges de la plateforme." />
      ) : (
        <div className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-left">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Catégorie</th>
                  <th className="px-4 py-2.5 font-medium">Libellé</th>
                  <th className="px-4 py-2.5 font-medium">Note</th>
                  <th className="px-4 py-2.5 font-medium text-right">Montant</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.category}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{e.label}</td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">{e.note ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-foreground tabular-nums whitespace-nowrap">{formatXof(e.amountCents)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEditForm(e)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary" title="Modifier">
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(e.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-secondary/40">
                  <td colSpan={4} className="px-4 py-2.5 text-right font-semibold text-foreground">
                    Total
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-foreground tabular-nums whitespace-nowrap">{formatXof(totalExpensesXofCents)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Modifier la dépense" : "Ajouter une dépense"}
        maxWidth="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isPending}>
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Libellé</label>
            <input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Ex : Hébergement Supabase — septembre"
              className="w-full h-10 rounded-xl border border-border/60 bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Catégorie</label>
              <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full">
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
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full h-10 rounded-xl border border-border/60 bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Montant (FCFA)</label>
            <input
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Ex : 25000"
              className="w-full h-10 rounded-xl border border-border/60 bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Note (optionnel)</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-border/60 bg-secondary/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        title="Supprimer cette dépense ?"
        description="Cette action est définitive."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete} leftIcon={<Trash2 size={14} />}>
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
