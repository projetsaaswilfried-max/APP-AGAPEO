"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { supportService } from "@/domain/services/support.service";
import { validateImageFile, FileValidationError } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LifeBuoy, AlertCircle, Image as ImageIcon, X } from "lucide-react";

interface NewSupportTicketFormProps {
  onCreated: (ticketId: string) => void;
}

interface PendingImage {
  file: File;
  previewUrl: string;
}

export function NewSupportTicketForm({ onCreated }: NewSupportTicketFormProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      validateImageFile(file);
      setPendingImage((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl);
        return { file, previewUrl: URL.createObjectURL(file) };
      });
      setError(null);
    } catch (err) {
      setError(err instanceof FileValidationError ? err.message : "Image invalide.");
    }
  };

  const clearImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || (!message.trim() && !pendingImage) || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const ticketId = await supportService.openTicket(subject, message, pendingImage?.file);
      if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
      onCreated(ticketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le dossier n'a pas pu être créé.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col h-full bg-card rounded-2xl border border-border/60 p-5 sm:p-6 gap-4"
    >
      <div className="flex flex-col items-center text-center gap-2 pb-1">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <LifeBuoy size={24} />
        </div>
        <h2 className="text-sm font-display font-semibold text-foreground">Ouvrir un dossier</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          Décris ta demande, l&apos;équipe Agapeo te répond directement dans ce dossier.
        </p>
      </div>

      <Input
        label="Objet"
        placeholder="Ex. Problème avec ma vérification"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={120}
        required
      />

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-foreground pl-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Explique-nous ta demande en détail..."
          rows={6}
          className="w-full rounded-2xl border border-border bg-secondary/40 px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" />

      {pendingImage ? (
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
            onClick={clearImage}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-card rounded-full transition-colors shrink-0"
            title="Retirer l'image"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 h-10 rounded-full border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
        >
          <ImageIcon size={15} /> Ajouter une image
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
        Envoyer
      </Button>
    </form>
  );
}
