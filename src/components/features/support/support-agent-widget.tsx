"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Headset, X, Send, Loader2 } from "lucide-react";
import { supportService, type SupportMessage } from "@/domain/services/support.service";
import { useSession } from "@/core/providers/session-provider";
import { IS_SUPPORT_AGENT_ENABLED } from "@/config/support-agent";
import { cn } from "@/lib/utils";

/**
 * Point d'entrée du support dans tout l'espace membre : un bouton flottant qui
 * ouvre une conversation avec l'assistant.
 *
 * L'échange est stocké dans les dossiers de support existants, donc la
 * conversation survit à la fermeture du panneau, se retrouve dans « Aide », et
 * l'équipe la voit dans son inbox. Quand un humain reprend le dossier, sa
 * réponse arrive ici par le temps réel sans que le membre ait à recharger.
 */

const GREETING =
  "Bonjour ! Dis-moi ce qui ne va pas — un souci d'abonnement, de paiement, de validation de photo, ou autre chose. " +
  "Je regarde ton compte et je règle ça avec toi.";

interface Bubble {
  id: string;
  fromTeam: boolean;
  content: string;
}

export function SupportAgentWidget() {
  const { profile } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Jamais par-dessus la messagerie : le clavier et la liste y occupent déjà
  // tout l'écran sur mobile. La page d'aide, elle, ouvre ce même panneau.
  const hidden = !IS_SUPPORT_AGENT_ENABLED || profile.is_staff || pathname === "/messages";

  const toBubble = (m: SupportMessage): Bubble => ({ id: m.id, fromTeam: m.isStaff, content: m.content });

  // La page d'aide ouvre ce panneau sans avoir à dupliquer la conversation :
  // un évènement suffit, pas besoin d'un provider pour deux boutons.
  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener("agapeo:open-support", open);
    return () => window.removeEventListener("agapeo:open-support", open);
  }, []);

  useEffect(() => {
    if (!isOpen || ticketId !== null) return;
    setIsLoadingHistory(true);
    let cancelled = false;
    (async () => {
      const open = await supportService.getMyOpenTicket();
      if (cancelled) return;
      if (open) {
        const messages = await supportService.getTicketMessages(open.id);
        if (cancelled) return;
        setTicketId(open.id);
        setBubbles(messages.map(toBubble));
      }
      setIsLoadingHistory(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, ticketId]);

  // Réponse d'un humain de l'équipe : elle arrive sans rechargement.
  useEffect(() => {
    if (!ticketId) return;
    return supportService.subscribeToTicket(ticketId, (message) => {
      setBubbles((prev) => (prev.some((b) => b.id === message.id) ? prev : [...prev, toBubble(message)]));
    });
  }, [ticketId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, isSending]);

  const send = async () => {
    const content = draft.trim();
    if (!content || isSending) return;
    setDraft("");
    setError(null);
    setIsSending(true);
    // Le message du membre s'affiche tout de suite ; l'identifiant provisoire
    // est remplacé par celui de la base quand la route répond.
    const provisional = `local-${Date.now()}`;
    setBubbles((prev) => [...prev, { id: provisional, fromTeam: false, content }]);

    try {
      const res = await fetch("/api/support/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message: content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Envoi impossible.");

      setTicketId(data.ticketId);
      setBubbles((prev) => {
        const withRealId = prev.map((b) => (b.id === provisional ? { ...b, id: data.memberMessageId ?? b.id } : b));
        if (!data.reply) return withRealId;
        if (withRealId.some((b) => b.id === data.agentMessageId)) return withRealId;
        return [...withRealId, { id: data.agentMessageId ?? `reply-${Date.now()}`, fromTeam: true, content: data.reply }];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
      setBubbles((prev) => prev.filter((b) => b.id !== provisional));
      setDraft(content);
    } finally {
      setIsSending(false);
    }
  };

  if (hidden) return null;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Contacter le support"
          className="fixed right-4 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] md:bottom-6 z-40 flex items-center gap-2 h-12 pl-3.5 pr-4 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all select-none"
        >
          <Headset size={19} />
          <span className="text-sm font-semibold">Aide</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 md:inset-auto md:right-5 md:bottom-5 md:w-[23rem] md:h-[33rem] flex flex-col bg-card md:rounded-[22px] md:border md:border-border/60 md:shadow-2xl overflow-hidden select-none">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-card shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-subtle text-primary shrink-0">
                <Headset size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">Aide Agapeo</p>
                <p className="text-[11px] text-muted-foreground truncate">On regarde ton compte et on règle ça</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fermer"
              className="p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground rounded-full shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : (
              <>
                {bubbles.length === 0 && (
                  <div className="max-w-[85%] px-3 py-2 rounded-[16px] rounded-bl-[6px] bg-secondary text-foreground text-sm leading-snug">
                    {GREETING}
                  </div>
                )}
                {bubbles.map((bubble) => (
                  <div key={bubble.id} className={cn("flex", bubble.fromTeam ? "justify-start" : "justify-end")}>
                    <div
                      className={cn(
                        "max-w-[85%] px-3 py-2 rounded-[16px] text-sm leading-snug whitespace-pre-line break-words",
                        bubble.fromTeam
                          ? "bg-secondary text-foreground rounded-bl-[6px]"
                          : "bg-primary text-primary-foreground rounded-br-[6px]"
                      )}
                    >
                      {bubble.content}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-[16px] rounded-bl-[6px] bg-secondary text-muted-foreground text-xs flex items-center gap-2">
                      <Loader2 size={13} className="animate-spin" /> On vérifie ton compte...
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {error && <p className="px-4 pb-1 text-[11px] text-destructive shrink-0">{error}</p>}

          <div className="flex items-end gap-2 px-3 py-2.5 border-t border-border/60 bg-card shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Explique ton souci..."
              className="flex-1 max-h-28 resize-none bg-secondary/60 rounded-[14px] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!draft.trim() || isSending}
              aria-label="Envoyer"
              className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
