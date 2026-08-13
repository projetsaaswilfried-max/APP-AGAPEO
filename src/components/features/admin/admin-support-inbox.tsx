"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supportService, SupportTicket, SupportTicketSummary } from "@/domain/services/support.service";
import { SupportTicketThread } from "@/components/features/support/support-ticket-thread";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { LifeBuoy, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "OPEN" | "CLOSED";

export function AdminSupportInbox() {
  const searchParams = useSearchParams();
  const preselectedTicketId = searchParams.get("ticket");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(preselectedTicketId);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(Boolean(preselectedTicketId));
  const [isLoading, setIsLoading] = useState(true);

  const loadTickets = async (filter: StatusFilter) => {
    const data = await supportService.getAllTickets(filter);
    setTickets(data);
    setIsLoading(false);
    if (!activeTicketId && data.length > 0) setActiveTicketId(data[0].id);
  };

  const handleSelectTicket = (ticketId: string) => {
    setActiveTicketId(ticketId);
    setIsMobileChatOpen(true);
  };

  useEffect(() => {
    loadTickets(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Rafraîchit la liste (compteurs non-lus, ordre) quand on change de dossier actif.
  useEffect(() => {
    if (activeTicketId) loadTickets(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTicketId]);

  const handleTicketClosed = () => {
    setActiveTicketId(null);
    void loadTickets(statusFilter);
  };

  const activeTicket: SupportTicket | undefined = tickets.find((t) => t.id === activeTicketId);

  return (
    <div className="flex h-[75dvh] rounded-2xl border border-border/60 overflow-hidden bg-card">
      <div className={cn("w-full sm:w-72 shrink-0 border-r border-border/60 overflow-y-auto flex flex-col", isMobileChatOpen && "hidden sm:flex")}>
        <div className="p-1.5 flex items-center gap-1 border-b border-border/40 shrink-0">
          {(["OPEN", "CLOSED"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setActiveTicketId(null);
              }}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                statusFilter === s ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "OPEN" ? "Ouverts" : "Clôturés"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground p-4">Chargement...</p>
        ) : tickets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-muted-foreground text-center">
              {statusFilter === "OPEN" ? "Aucun dossier ouvert." : "Aucun dossier clôturé."}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTicket(t.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 p-3 text-left border-b border-border/40 hover:bg-secondary/50 transition-colors",
                  activeTicketId === t.id && "bg-secondary"
                )}
              >
                <Avatar size="sm" src={t.avatarUrl ?? undefined} fallback={t.firstName.charAt(0)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {t.firstName} {t.lastName}
                    </span>
                    {t.unreadCount > 0 && (
                      <span className="flex items-center justify-center text-[10px] font-bold text-accent-foreground bg-accent rounded-full min-w-4 h-4 px-1 shrink-0">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-foreground/80 truncate">{t.subject}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {t.lastMessage
                      ? `${t.lastMessage.isStaff ? "Vous : " : ""}${t.lastMessage.content || (t.lastMessage.attachmentMimeType ? "📷 Photo" : "")}`
                      : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={cn("flex-1 min-w-0 p-3 flex-col min-h-0", isMobileChatOpen ? "flex" : "hidden sm:flex")}>
        {activeTicket ? (
          <>
            <button
              onClick={() => setIsMobileChatOpen(false)}
              className="sm:hidden flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground pb-2 shrink-0"
            >
              <ArrowLeft size={14} /> Retour aux dossiers
            </button>
            <SupportTicketThread ticket={activeTicket} viewerIsStaff onTicketClosed={handleTicketClosed} className="flex-1 min-h-0" />
          </>
        ) : isLoading ? null : (
          <EmptyState
            icon={<LifeBuoy size={28} />}
            title="Aucun dossier sélectionné"
            description="Sélectionne un dossier à gauche pour voir la conversation."
          />
        )}
      </div>
    </div>
  );
}
