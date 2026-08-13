"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitReportAction } from "@/lib/actions/moderation.actions";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "PROFILE" | "MESSAGE" | "POST";
  targetId: string;
}

const REASONS = [
  "Comportement irrespectueux",
  "Faux profil / usurpation",
  "Contenu inapproprié",
  "Sollicitation commerciale",
  "Autre"
];

export function ReportModal({ isOpen, onClose, targetType, targetId }: ReportModalProps) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await submitReportAction({ targetType, targetId, reason, details: details || undefined });
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setIsSubmitted(true);
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setDetails("");
    setReason(REASONS[0]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Signaler" description="Explique le problème à l'équipe de modération.">
      {isSubmitted ? (
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          <p className="text-sm text-foreground">Merci, ton signalement a été transmis à l&apos;équipe.</p>
          <Button variant="outline" size="sm" onClick={handleClose}>
            Fermer
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Motif</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Détails (optionnel)</label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
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
              Envoyer le signalement
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
