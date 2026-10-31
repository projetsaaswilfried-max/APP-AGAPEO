"use client";

import { useEffect, useState } from "react";
import { supportService, SupportTicket } from "@/domain/services/support.service";
import { SupportTicketThread } from "./support-ticket-thread";
import { SupportTicketHistory } from "./support-ticket-history";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dossiers EXISTANTS uniquement — l'ouverture de nouveaux dossiers par les
 * membres a été retirée au profit de WhatsApp (cf. src/config/support.ts).
 * Ce bloc reste indispensable malgré tout : l'équipe ouvre encore des
 * dossiers elle-même depuis la modération (openReportConversationAction)
 * pour demander une explication, et la personne concernée doit pouvoir y
 * répondre. Ne s'affiche donc que si le membre a réellement un dossier.
 */
export function SupportPageClient() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const loadTickets = async (selectId?: string) => {
    const [openTicket, allTickets] = await Promise.all([supportService.getMyOpenTicket(), supportService.getMyTickets()]);
    setTickets(allTickets);
    setIsLoading(false);

    if (selectId) {
      setSelectedTicket(allTickets.find((t) => t.id === selectId) ?? null);
    } else if (openTicket) {
      setSelectedTicket(openTicket);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsMobilePanelOpen(true);
  };

  const handleClosed = async (ticketId: string) => {
    await loadTickets(ticketId);
  };

  // Rien à montrer tant qu'il n'y a aucun dossier : la page se résume alors
  // au bloc WhatsApp, sans rappel d'un système que le membre n'utilise plus.
  if (isLoading || tickets.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Tes dossiers en cours</h2>
      <div className="flex h-[70dvh] min-h-0 rounded-2xl border border-border/60 overflow-hidden bg-card">
        <div className={cn("w-full md:w-72 shrink-0 border-r border-border/60 overflow-y-auto p-3", isMobilePanelOpen && "hidden md:block")}>
          <SupportTicketHistory tickets={tickets} activeTicketId={selectedTicket?.id} onSelect={handleSelectTicket} />
        </div>

        <div className={cn("flex-1 min-w-0 p-3 flex-col min-h-0", isMobilePanelOpen ? "flex" : "hidden md:flex")}>
          <button
            onClick={() => setIsMobilePanelOpen(false)}
            className="md:hidden flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground pb-2 shrink-0"
          >
            <ArrowLeft size={14} /> Retour à mes dossiers
          </button>
          {selectedTicket ? (
            <SupportTicketThread ticket={selectedTicket} onTicketClosed={handleClosed} className="flex-1 min-h-0" />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground text-center px-6">
              Sélectionne un dossier pour le consulter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
