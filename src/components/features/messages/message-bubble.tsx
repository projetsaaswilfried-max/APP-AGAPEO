"use client";

import React, { useState } from "react";
import { ChatMessage } from "@/domain/types/message";
import { FileAttachment } from "@/components/ui/file-attachment";
import { VoiceMessagePlayer } from "@/components/features/messages/voice-message-player";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Tick01Icon,
  TickDouble01Icon,
  MoreHorizontalIcon,
  Copy01Icon,
  Delete02Icon
} from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { cn } from "@/lib/utils";
import { linkifyText } from "@/lib/linkify";

function formatReadTime(iso?: string): string {
  if (!iso) return "Lu";
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Lu aujourd'hui à ${time}`;
  return `Lu le ${date.toLocaleDateString("fr-FR")} à ${time}`;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onDeleteMessage?: (id: string) => void;
}

export function MessageBubble({
  message,
  isCurrentUser,
  onDeleteMessage
}: MessageBubbleProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Message Système Centré
  if (message.type === "SYSTEM") {
    return (
      <div className="flex justify-center my-3 select-none">
        <div className="px-4 py-1.5 rounded-full bg-secondary/60 border border-border/40 text-[11px] text-muted-foreground font-medium text-center max-w-md">
          {message.content}
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message.content);
      alert("Texte du message copié dans le presse-papier.");
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col space-y-1 my-1.5 select-none group relative",
        isCurrentUser ? "items-end" : "items-start"
      )}
    >
      <div className="flex items-center gap-1 max-w-[85%] sm:max-w-[70%]">
        {/* Dropdown Options (Au survol) */}
        {isCurrentUser && (
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-full"
            >
              <HugeIcon icon={MoreHorizontalIcon} size={14} />
            </button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 bottom-6 w-36 p-1.5 bg-card border border-border/40 rounded-2xl shadow-soft z-40 text-xs">
                  <button
                    onClick={() => {
                      handleCopy();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-foreground hover:bg-secondary rounded-lg"
                  >
                    <HugeIcon icon={Copy01Icon} size={13} /> Copier
                  </button>
                  {onDeleteMessage && (
                    <button
                      onClick={() => {
                        onDeleteMessage(message.id);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <HugeIcon icon={Delete02Icon} size={13} /> Supprimer
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Bulle de Message */}
        <div
          className={cn(
            "min-w-0 p-3.5 rounded-3xl text-xs space-y-2 leading-relaxed shadow-soft transition-all border",
            isCurrentUser
              ? "bg-primary text-primary-foreground rounded-br-xs border-primary/20 font-medium"
              : "bg-card text-foreground rounded-bl-xs border-border/40 font-normal"
          )}
        >
          {/* Pièces jointes (Document / Image / Vidéo) */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2">
              {message.attachments.map((att) => {
                if (att.type === "DOCUMENT") {
                  return (
                    <FileAttachment
                      key={att.id}
                      type="DOCUMENT"
                      title={att.name || "Document joint"}
                      fileSizeBytes={att.sizeBytes}
                      url={att.url}
                    />
                  );
                }
                if (att.type === "IMAGE") {
                  return (
                    <div key={att.id} className="rounded-2xl overflow-hidden max-w-xs border border-border/40 shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={att.url} alt="Image jointe" className="w-full h-auto object-cover" />
                    </div>
                  );
                }
                if (att.type === "VIDEO") {
                  return (
                    <div key={att.id} className="rounded-2xl overflow-hidden max-w-xs border border-border/40 bg-black shadow-xs">
                      <video src={att.url} controls className="w-full h-auto max-h-64" />
                    </div>
                  );
                }
                if (att.type === "AUDIO") {
                  return (
                    <VoiceMessagePlayer
                      key={att.id}
                      url={att.url}
                      durationSeconds={att.durationSeconds}
                      mimeType={att.mimeType}
                      isCurrentUser={isCurrentUser}
                    />
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Contenu Texte — pour les pièces jointes (IMAGE/VIDEO/DOCUMENT), `content` ne
              contient que le nom de fichier technique (cf. sendFileAttachment), jamais une
              légende saisie par l'utilisateur : on ne l'affiche donc que pour les vrais messages texte. */}
          {message.content && message.type === "TEXT" && (
            <p className="whitespace-pre-line break-words">{linkifyText(message.content)}</p>
          )}

          {/* Heure et Ticks d'état (✓✓) */}
          <div
            className={cn(
              "flex items-center justify-end gap-1 text-[10px] pt-0.5 font-mono",
              isCurrentUser ? "text-primary-foreground/80" : "text-muted-foreground opacity-80"
            )}
          >
            <span>{message.createdAt}</span>
            {isCurrentUser && (
              <Tooltip content={message.status === "READ" ? formatReadTime(message.readAt) : "Distribué"} side="top">
                <span>
                  {message.status === "READ" ? (
                    <HugeIcon icon={TickDouble01Icon} size={13} className="text-primary-foreground font-bold" />
                  ) : (
                    <HugeIcon icon={Tick01Icon} size={13} className="text-primary-foreground/70" />
                  )}
                </span>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
