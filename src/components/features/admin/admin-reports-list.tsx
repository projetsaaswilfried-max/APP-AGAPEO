"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { updateReportStatusAction } from "@/lib/actions/admin.actions";
import type { ReportStatus, ReportTargetType } from "@/lib/supabase/database.types";
import { Flag } from "lucide-react";

export interface AdminReportRow {
  id: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetId: string;
  targetName?: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: "En attente",
  REVIEWED: "Examiné",
  DISMISSED: "Rejeté",
  ACTION_TAKEN: "Action prise"
};

const TARGET_LABELS: Record<ReportTargetType, string> = {
  PROFILE: "Profil",
  MESSAGE: "Message",
  POST: "Publication"
};

export function AdminReportsList({ initialReports }: { initialReports: AdminReportRow[] }) {
  const [reports, setReports] = useState(initialReports);
  const [filter, setFilter] = useState<ReportStatus | "ALL">("PENDING");
  const [isPending, startTransition] = useTransition();

  const filtered = filter === "ALL" ? reports : reports.filter((r) => r.status === filter);

  const handleStatusChange = (id: string, status: ReportStatus) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    startTransition(async () => {
      await updateReportStatusAction(id, status);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl border border-border/40 w-fit overflow-x-auto no-scrollbar">
        {(["PENDING", "REVIEWED", "ACTION_TAKEN", "DISMISSED", "ALL"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              filter === s ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "ALL" ? "Tous" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Flag size={22} />} title="Aucun signalement" description="Rien à traiter dans cette catégorie pour le moment." />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="p-4 bg-card border border-border/60 rounded-2xl shadow-2xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="status" className="text-[10px]">
                    {TARGET_LABELS[r.targetType]}
                  </Badge>
                  <span className="font-semibold text-foreground">{r.reason}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{new Date(r.createdAt).toLocaleString("fr-FR")}</span>
              </div>

              {r.details && <p className="text-xs text-muted-foreground leading-relaxed">{r.details}</p>}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                <div className="text-[11px] text-muted-foreground">
                  Signalé par <span className="text-foreground font-medium">{r.reporterName}</span>
                  {r.targetType === "PROFILE" && (
                    <>
                      {" "}
                      contre{" "}
                      <Link href={`/profile/${r.targetId}`} target="_blank" className="text-foreground font-medium hover:underline">
                        {r.targetName ?? "ce profil"}
                      </Link>
                    </>
                  )}
                </div>
                <select
                  value={r.status}
                  disabled={isPending}
                  onChange={(e) => handleStatusChange(r.id, e.target.value as ReportStatus)}
                  className="text-xs bg-secondary/60 border border-border/60 rounded-lg px-2 py-1 disabled:opacity-60"
                >
                  {(Object.keys(STATUS_LABELS) as ReportStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
