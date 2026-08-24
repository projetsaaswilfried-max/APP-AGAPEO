"use client";

import { useState } from "react";
import { messageService } from "@/domain/services/message.service";
import { PremiumRequiredError, VerificationRequiredError } from "@/domain/errors";

interface InvitationTarget {
  id: string;
  firstName: string;
}

interface UseSendInvitationOptions {
  onSuccess: (conversationId: string) => void;
  onPremiumRequired?: () => void;
  onVerificationRequired?: () => void;
  onError?: (message: string) => void;
}

/**
 * "Envoyer un message" ne démarre plus jamais la messagerie directement —
 * ça déclenche une invitation que l'autre doit accepter en premier (cf.
 * `conversations.status`). Ce hook centralise le petit pas intermédiaire
 * (pop-up d'explication -> confirmation -> envoi réel) partagé par tous les
 * points d'entrée (Découvrir, profil public, favoris, qui s'intéresse à moi).
 */
export function useSendInvitation({ onSuccess, onPremiumRequired, onVerificationRequired, onError }: UseSendInvitationOptions) {
  const [pendingTarget, setPendingTarget] = useState<InvitationTarget | null>(null);
  const [isSending, setIsSending] = useState(false);

  const requestSend = (id: string, firstName: string) => setPendingTarget({ id, firstName });
  const cancel = () => setPendingTarget(null);

  const confirmSend = async () => {
    if (!pendingTarget) return;
    setIsSending(true);
    try {
      const conversationId = await messageService.getOrCreateConversation(pendingTarget.id);
      setPendingTarget(null);
      onSuccess(conversationId);
    } catch (err) {
      setPendingTarget(null);
      if (err instanceof PremiumRequiredError) {
        onPremiumRequired?.();
        return;
      }
      if (err instanceof VerificationRequiredError) {
        onVerificationRequired?.();
        return;
      }
      onError?.(err instanceof Error ? err.message : "Impossible d'envoyer l'invitation.");
    } finally {
      setIsSending(false);
    }
  };

  return { pendingTarget, isSending, requestSend, cancel, confirmSend };
}
