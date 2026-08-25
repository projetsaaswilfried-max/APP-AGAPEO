"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

interface RejectPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  onConfirm: (reason: string) => Promise<{ error?: string } | void>;
}

const REASON_SUGGESTIONS = [
  "Photo inappropriée pour une plateforme chrétienne",
  "Tenue jugée trop dénudée",
  "Photo de groupe (visage peu identifiable)",
  "Filtre ou montage excessif",
  "Photo générique ou tirée d'internet",
  "Qualité insuffisante (floue, sombre...)"
];

export function RejectPhotoModal({ isOpen, onClose, memberName, onConfirm }: RejectPhotoModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setReason("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Le motif du refus est obligatoire — il sera envoyé au membre.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const result = await onConfirm(reason.trim());
    setIsSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Refuser cette photo de ${memberName}`}
      description="Ce motif est envoyé directement au membre en notification — sois clair et bienveillant."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {REASON_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setReason(s)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Motif du refus</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Explique pourquoi cette photo n'est pas validée..."
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Annuler
          </Button>
          <Button variant="destructive" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
            Confirmer le refus
          </Button>
        </div>
      </div>
    </Modal>
  );
}
