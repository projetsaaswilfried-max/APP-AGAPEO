"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supportService, SupportMessage, SupportTicket } from "@/domain/services/support.service";
import { notifyStaffOfSupportMessageAction } from "@/lib/actions/support.actions";
import { validateImageFile, FileValidationError } from "@/lib/storage";
import { SupportMessageBubble } from "./support-message-bubble";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Button } from "@/components/ui/button";
import { Send, LifeBuoy, CheckCircle2, Lock, Image as ImageIcon, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupportTicketThreadProps {
  ticket: SupportTicket;
  viewerIsStaff?: boolean;
  onTicketClosed?: (ticketId: string) => void;
  className?: string;
}

interface PendingImage {
  file: File;
  previewUrl: string;
}

export function SupportTicketThread({ ticket, viewerIsStaff = false, onTicketClosed, className }: SupportTicketThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isOpen = ticket.status === "OPEN";

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const thread = await supportService.getTicketMessages(ticket.id);
      if (cancelled) return;
      setMessages(thread);
      setIsLoading(false);
      await supportService.markTicketRead(ticket.id, viewerIsStaff);
      // Le badge "dossiers ouverts" de la nav admin (AdminLayout) est calculé
      // côté serveur à chaque navigation — sans ça il restait affiché tant
      // que la page n'était pas rechargée, alors que ce dossier venait
      // d'être lu.
      router.refresh();
    })();

    const unsubscribe = supportService.subscribeToTicket(ticket.id, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      void supportService.markTicketRead(ticket.id, viewerIsStaff).then(() => router.refresh());
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const content = text.trim();
    if ((!content && !pendingImage) || isSending || !isOpen) return;
    setIsSending(true);

    if (pendingImage) {
      const { file, previewUrl } = pendingImage;
      setPendingImage(null);
      setText("");
      try {
        const sent = await supportService.sendImageMessage(ticket, file, viewerIsStaff, content);
        setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
        if (!viewerIsStaff) {
          void notifyStaffOfSupportMessageAction(ticket.id, ticket.subject, content || "[Photo]");
        }
      } catch (err) {
        setImageError(err instanceof Error ? err.message : "L'image n'a pas pu être envoyée.");
        setText(content);
      } finally {
        URL.revokeObjectURL(previewUrl);
        setIsSending(false);
      }
      return;
    }

    setText("");
    try {
      const sent = await supportService.sendMessage(ticket, content, viewerIsStaff);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      if (!viewerIsStaff) {
        void notifyStaffOfSupportMessageAction(ticket.id, ticket.subject, content);
      }
    } catch {
      setText(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      validateImageFile(file);
      setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
      setImageError(null);
    } catch (err) {
      setImageError(err instanceof FileValidationError ? err.message : "Image invalide.");
    }
  };

  const handleClose = async () => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await supportService.closeTicket(ticket.id);
      onTicketClosed?.(ticket.id);
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full min-h-0 bg-secondary/30 rounded-2xl overflow-hidden border border-border/60", className)}>
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-card border-b border-border/60 shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
          <p className="text-[11px] text-muted-foreground">
            {isOpen ? "Dossier ouvert" : `Dossier clôturé le ${new Date(ticket.closedAt ?? ticket.createdAt).toLocaleDateString("fr-FR")}`}
          </p>
        </div>
        {isOpen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full text-xs shrink-0"
            onClick={handleClose}
            isLoading={isClosing}
          >
            <CheckCircle2 size={14} className="mr-1" />
            Clôturer
          </Button>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground shrink-0">
            <Lock size={12} /> Clôturé
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-8">Chargement...</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-10">
            <LifeBuoy size={28} className="text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Aucun message dans ce dossier.</p>
          </div>
        ) : (
          messages.map((m) => <SupportMessageBubble key={m.id} message={m} viewerIsStaff={viewerIsStaff} />)
        )}
        <div ref={bottomRef} />
      </div>

      {isOpen ? (
        <div className="p-3 bg-card border-t border-border/60 shrink-0 space-y-2">
          <input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" />

          {imageError && (
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-xs text-destructive">
              <AlertCircle size={14} className="shrink-0" />
              <span>{imageError}</span>
            </div>
          )}

          {pendingImage && (
            <div className="p-2.5 bg-secondary/50 border border-border/60 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-black border border-border/40 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pendingImage.previewUrl} alt="Aperçu" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-medium text-foreground truncate">{pendingImage.file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(pendingImage.previewUrl);
                  setPendingImage(null);
                }}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-card rounded-full transition-colors shrink-0"
                title="Annuler"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary bg-secondary/60 hover:bg-accent-subtle rounded-full transition-colors shrink-0"
              title="Joindre une image"
            >
              <ImageIcon size={17} />
            </button>

            <div className="flex-1 bg-secondary/50 border border-border/60 rounded-2xl px-3.5 py-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-all">
              <textarea
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={pendingImage ? "Ajouter une légende (optionnel)..." : viewerIsStaff ? "Répondre..." : "Écris ton message..."}
                className="flex-1 bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-28"
              />
              <EmojiPicker onSelect={(emoji) => setText((prev) => prev + emoji)} />
            </div>
            <Button
              type="button"
              size="icon"
              variant="primary"
              className="h-10 w-10 rounded-xl shrink-0 shadow-2xs disabled:opacity-40"
              title="Envoyer"
              disabled={(!text.trim() && !pendingImage) || isSending}
              onClick={handleSend}
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-card border-t border-border/60 text-center text-[11px] text-muted-foreground shrink-0">
          Ce dossier est clôturé — ouvre un nouveau dossier pour une nouvelle demande.
        </div>
      )}
    </div>
  );
}
