"use client";

import { useEffect, useState } from "react";
import { supportService, SupportTicket } from "@/domain/services/support.service";
import { SupportTicketThread } from "./support-ticket-thread";
import { SupportTicketHistory } from "./support-ticket-history";
import { NewSupportTicketForm } from "./new-support-ticket-form";
import { ArrowLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function SupportPageClient() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const loadTickets = async (selectId?: string) => {
    const [openTicket, allTickets] = await Promise.all([supportService.getMyOpenTicket(), supportService.getMyTickets()]);
    setTickets(allTickets);
    setIsLoading(false);

    if (selectId) {
      const match = allTickets.find((t) => t.id === selectId) ?? null;
      setSelectedTicket(match);
      setIsCreatingNew(false);
    } else if (openTicket) {
      setSelectedTicket(openTicket);
      setIsCreatingNew(false);
    } else {
      setSelectedTicket(null);
      setIsCreatingNew(allTickets.length === 0);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsCreatingNew(false);
    setIsMobilePanelOpen(true);
  };

  const handleStartNewTicket = () => {
    setSelectedTicket(null);
    setIsCreatingNew(true);
    setIsMobilePanelOpen(true);
  };

  const handleCreated = async (ticketId: string) => {
    await loadTickets(ticketId);
    setIsMobilePanelOpen(true);
  };

  const handleClosed = async (ticketId: string) => {
    await loadTickets(ticketId);
  };

  const hasOpenTicket = tickets.some((t) => t.status === "OPEN");

  if (isLoading) {
    return <p className="text-xs text-muted-foreground p-4">Chargement...</p>;
  }

  return (
    <div className="flex h-full min-h-0 rounded-2xl border border-border/60 overflow-hidden bg-card">
      <div className={cn("w-full sm:w-72 shrink-0 border-r border-border/60 overflow-y-auto p-3 space-y-3", isMobilePanelOpen && "hidden sm:block")}>
        {!hasOpenTicket && (
          <button
            type="button"
            onClick={handleStartNewTicket}
            className="w-full flex items-center justify-center gap-1.5 h-10 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-2xs hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> Ouvrir un dossier
          </button>
        )}
        <SupportTicketHistory tickets={tickets} activeTicketId={selectedTicket?.id} onSelect={handleSelectTicket} />
      </div>

      <div className={cn("flex-1 min-w-0 p-3 flex-col min-h-0", isMobilePanelOpen ? "flex" : "hidden sm:flex")}>
        <button
          onClick={() => setIsMobilePanelOpen(false)}
          className="sm:hidden flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground pb-2 shrink-0"
        >
          <ArrowLeft size={14} /> Retour à mes dossiers
        </button>
        {isCreatingNew ? (
          <NewSupportTicketForm onCreated={handleCreated} />
        ) : selectedTicket ? (
          <SupportTicketThread ticket={selectedTicket} onTicketClosed={handleClosed} className="flex-1 min-h-0" />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground text-center px-6">
            Sélectionne un dossier à gauche ou ouvre-en un nouveau.
          </div>
        )}
      </div>
    </div>
  );
}
