"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollableRow } from "@/components/ui/scrollable-row";
import type { TransactionStatus } from "@/lib/supabase/database.types";
import { Receipt, TrendingUp } from "lucide-react";

export interface AdminTransactionRow {
  id: string;
  userName: string;
  amountCents: number;
  currency: string;
  status: TransactionStatus;
  plan: string | null;
  provider: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING: "En attente",
  SUCCEEDED: "Réussie",
  FAILED: "Échouée",
  REFUNDED: "Remboursée"
};

const STATUS_COLORS: Record<TransactionStatus, string> = {
  SUCCEEDED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  FAILED: "bg-destructive/10 text-destructive border-destructive/30",
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  REFUNDED: "bg-secondary text-secondary-foreground border-border/40"
};

const RANGE_PRESETS = [
  { id: "7d", label: "7 derniers jours", days: 7 },
  { id: "30d", label: "30 derniers jours", days: 30 },
  { id: "90d", label: "90 derniers jours", days: 90 },
  { id: "all", label: "Tout", days: null as number | null }
];

function formatAmount(cents: number, currency: string) {
  return `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ${currency}`;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function AdminTransactionsList({ transactions }: { transactions: AdminTransactionRow[] }) {
  const [rangeId, setRangeId] = useState("30d");
  const [dateFrom, setDateFrom] = useState(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return toDateInputValue(cutoff);
  });
  const [dateTo, setDateTo] = useState("");

  const handlePreset = (id: string) => {
    setRangeId(id);
    const preset = RANGE_PRESETS.find((r) => r.id === id);
    if (!preset?.days) {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - preset.days);
    setDateFrom(toDateInputValue(cutoff));
    setDateTo("");
  };

  const handleCustomDateChange = (field: "from" | "to", value: string) => {
    setRangeId("custom");
    if (field === "from") setDateFrom(value);
    else setDateTo(value);
  };

  const handleReset = () => {
    setRangeId("30d");
    handlePreset("30d");
  };

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (dateFrom && t.createdAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && t.createdAt.slice(0, 10) > dateTo) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo]);

  const totalRevenue = filtered.filter((t) => t.status === "SUCCEEDED").reduce((sum, t) => sum + t.amountCents, 0);
  const currency = filtered[0]?.currency ?? "XOF";
  const succeededCount = filtered.filter((t) => t.status === "SUCCEEDED").length;
  const pendingCount = filtered.filter((t) => t.status === "PENDING").length;
  const failedCount = filtered.filter((t) => t.status === "FAILED").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ScrollableRow className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl border border-border/40 w-full sm:w-fit">
          {RANGE_PRESETS.map((r) => (
            <button
              key={r.id}
              onClick={() => handlePreset(r.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                rangeId === r.id ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </ScrollableRow>

        <div className="flex flex-wrap items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Du</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleCustomDateChange("from", e.target.value)}
            className="text-xs h-9 bg-card border border-border/60 rounded-xl px-2.5 text-foreground"
          />
          <label className="text-xs text-muted-foreground">au</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleCustomDateChange("to", e.target.value)}
            className="text-xs h-9 bg-card border border-border/60 rounded-xl px-2.5 text-foreground"
          />
          {(dateFrom || dateTo) && (
            <button type="button" onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="base" className="p-4 border-border/60 shadow-2xs space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <TrendingUp size={12} /> Revenu (réussies)
          </p>
          <p className="text-xl font-display font-semibold text-foreground">{formatAmount(totalRevenue, currency)}</p>
        </Card>
        <Card variant="base" className="p-4 border-border/60 shadow-2xs space-y-1">
          <p className="text-[11px] text-muted-foreground">Transactions réussies</p>
          <p className="text-xl font-display font-semibold text-foreground">{succeededCount}</p>
        </Card>
        <Card variant="base" className="p-4 border-border/60 shadow-2xs space-y-1">
          <p className="text-[11px] text-muted-foreground">En attente</p>
          <p className="text-xl font-display font-semibold text-foreground">{pendingCount}</p>
        </Card>
        <Card variant="base" className="p-4 border-border/60 shadow-2xs space-y-1">
          <p className="text-[11px] text-muted-foreground">Échouées</p>
          <p className="text-xl font-display font-semibold text-foreground">{failedCount}</p>
        </Card>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt size={22} />}
          title="Aucune transaction pour le moment"
          description="Cette section s'alimentera automatiquement dès que le système d'abonnement et de paiement sera configuré."
        />
      ) : (
        <div className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-left">
                  <th className="px-4 py-2.5 font-medium">Membre</th>
                  <th className="px-4 py-2.5 font-medium">Plan</th>
                  <th className="px-4 py-2.5 font-medium">Montant</th>
                  <th className="px-4 py-2.5 font-medium">Fournisseur</th>
                  <th className="px-4 py-2.5 font-medium">Statut</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{t.userName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.plan ?? "—"}</td>
                    <td className="px-4 py-2.5 text-foreground">{formatAmount(t.amountCents, t.currency)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.provider ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="status" className={`text-[10px] ${STATUS_COLORS[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString("fr-FR")}{" "}
                      {new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
