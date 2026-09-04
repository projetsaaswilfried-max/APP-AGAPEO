"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface SendInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  firstName: string;
  isSending: boolean;
}

/**
 * Étape obligatoire avant toute conversation : "Envoyer un message" ne
 * démarre jamais la messagerie directement, ça envoie une invitation que
 * l'autre doit accepter en premier — cette pop-up l'explique avant l'envoi.
 */
export function SendInvitationModal({ isOpen, onClose, onConfirm, firstName, isSending }: SendInvitationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Envoyer une invitation à ${firstName}`} maxWidth="sm">
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <MessageSquare size={24} />
        </div>
        <p className="text-sm text-foreground">
          Pour préserver la confidentialité de chacun, tu ne peux pas écrire directement à {firstName}. {firstName} recevra ton invitation et devra
          l&apos;accepter avant que vous puissiez échanger des messages. Tu recevras une notification dès que ce sera fait.
        </p>
        {/* Empilés (pas côte à côte) : la modale garde une largeur fixe et
            étroite quel que soit l'écran — deux boutons à largeur égale
            forceraient "Envoyer l'invitation" à passer sur 2 lignes. */}
        <div className="flex flex-col gap-2.5 w-full pt-2">
          <Button variant="primary" className="w-full" onClick={onConfirm} isLoading={isSending} leftIcon={<MessageSquare size={15} />}>
            Envoyer l&apos;invitation
          </Button>
          <Button variant="outline" className="w-full" onClick={onClose} disabled={isSending}>
            Annuler
          </Button>
        </div>
      </div>
    </Modal>
  );
}
