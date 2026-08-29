"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, ShieldOff } from "lucide-react";

interface SuspendUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  onConfirm: (reason?: string) => Promise<{ error?: string } | void>;
}

/**
 * Remplace un ancien `window.prompt()` pour saisir le motif — silencieusement
 * non fonctionnel dans certains contextes (navigateur mobile embarqué, TWA
 * Android sans WebChromeClient personnalisé), ce qui pouvait donner
 * l'impression que le bouton "Suspendre" ne faisait rien.
 */
export function SuspendUserModal({ isOpen, onClose, memberName, onConfirm }: SuspendUserModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setReason("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await onConfirm(reason.trim() || undefined);
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
      title={`Suspendre le compte de ${memberName}`}
      description="Le membre est immédiatement déconnecté et ne peut plus accéder à Agapeo. Un email l'en informe, avec ce motif s'il est renseigné."
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Motif (optionnel, envoyé au membre par email)</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Explique pourquoi ce compte est suspendu..."
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button variant="destructive" size="sm" onClick={handleSubmit} isLoading={isSubmitting} leftIcon={<ShieldOff size={14} />}>
            Suspendre le compte
          </Button>
        </div>
      </div>
    </Modal>
  );
}
