import { SupportMessage } from "@/domain/services/support.service";
import { linkifyText } from "@/lib/linkify";
import { cn } from "@/lib/utils";

interface SupportMessageBubbleProps {
  message: SupportMessage;
  /** Le lecteur voit-il ce dossier en tant que membre du staff ? Inverse l'alignement gauche/droite. */
  viewerIsStaff: boolean;
}

export function SupportMessageBubble({ message, viewerIsStaff }: SupportMessageBubbleProps) {
  const isOwn = message.isStaff === viewerIsStaff;
  const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-2xs",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card text-foreground border border-border/60 rounded-bl-sm"
        )}
      >
        {!isOwn && (
          <p className="text-[10px] font-semibold text-primary mb-0.5">{message.isStaff ? "Équipe Agapeo" : "Membre"}</p>
        )}
        {message.attachmentUrl && (
          <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block -mx-0.5 mb-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.attachmentUrl}
              alt="Image envoyée"
              className="max-w-full max-h-64 rounded-xl border border-black/5 object-cover"
            />
          </a>
        )}
        {message.content && <p className="text-sm whitespace-pre-line break-words">{linkifyText(message.content)}</p>}
        <p className={cn("text-[10px] mt-1 text-right", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>{time}</p>
      </div>
    </div>
  );
}
