"use client";

import { SupportTicket } from "@/domain/services/support.service";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock } from "lucide-react";

interface SupportTicketHistoryProps {
  tickets: SupportTicket[];
  activeTicketId?: string;
  onSelect: (ticket: SupportTicket) => void;
}

export function SupportTicketHistory({ tickets, activeTicketId, onSelect }: SupportTicketHistoryProps) {
  if (tickets.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground px-1">Mes dossiers précédents</p>
      <div className="space-y-1.5">
        {tickets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className={cn(
              "w-full flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-colors",
              activeTicketId === t.id ? "bg-secondary border-border/70" : "bg-card border-border/50 hover:bg-secondary/50"
            )}
          >
            {t.status === "OPEN" ? (
              <Clock size={16} className="text-primary shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{t.subject}</p>
              <p className="text-[11px] text-muted-foreground">
                {t.status === "OPEN" ? "Ouvert" : "Clôturé"} · {new Date(t.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
