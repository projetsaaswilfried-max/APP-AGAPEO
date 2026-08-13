"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { blockUserAction } from "@/lib/actions/moderation.actions";
import { AlertCircle } from "lucide-react";

interface BlockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockedProfileId: string;
  blockedProfileName: string;
  onBlocked?: () => void;
}

export function BlockConfirmModal({ isOpen, onClose, blockedProfileId, blockedProfileName, onBlocked }: BlockConfirmModalProps) {
  const [isBlocking, setIsBlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsBlocking(true);
    setError(null);
    const result = await blockUserAction(blockedProfileId);
    setIsBlocking(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onBlocked?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bloquer ${blockedProfileName} ?`}
      description="Cette personne ne pourra plus t'envoyer de messages ni voir ton profil, et disparaîtra de ta Découverte."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm} isLoading={isBlocking}>
            Bloquer
          </Button>
        </>
      }
    >
      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
    </Modal>
  );
}
