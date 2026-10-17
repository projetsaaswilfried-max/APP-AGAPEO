"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";

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
 * l'autre doit accepter en premier. Sur mobile, présentée comme une feuille
 * qui glisse depuis le bas (format de l'app native) plutôt qu'une modale
 * centrée — desktop garde la modale centrée existante.
 */
export function SendInvitationModal({ isOpen, onClose, onConfirm, firstName, isSending }: SendInvitationModalProps) {
  const explanation = (
    <>
      Pour préserver la confidentialité de chacun, tu ne peux pas écrire directement à {firstName}. {firstName} recevra ton invitation
      et devra l&apos;accepter avant que vous puissiez échanger des messages. Tu recevras une notification dès que ce sera fait.
    </>
  );

  return (
    <>
      {/* Mobile : feuille glissant depuis le bas. */}
      <div className="md:hidden">
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-50">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-foreground/45 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
                className="absolute bottom-0 inset-x-0 bg-card rounded-t-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] select-none"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-display font-semibold text-foreground tracking-tight">
                    Envoyer une invitation à {firstName}
                  </h3>
                  <button onClick={onClose} className="p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground rounded-full" aria-label="Fermer">
                    <X size={18} />
                  </button>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed mt-2">{explanation}</p>
                <div className="flex flex-col gap-2.5 pt-5">
                  <Button variant="primary" className="w-full" onClick={onConfirm} isLoading={isSending} leftIcon={<MessageSquare size={15} />}>
                    Envoyer l&apos;invitation
                  </Button>
                  <Button variant="outline" className="w-full" onClick={onClose} disabled={isSending}>
                    Annuler
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop : modale centrée inchangée. */}
      <div className="hidden md:block">
        <Modal isOpen={isOpen} onClose={onClose} title={`Envoyer une invitation à ${firstName}`} maxWidth="sm">
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <MessageSquare size={24} />
            </div>
            <p className="text-sm text-foreground">{explanation}</p>
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
      </div>
    </>
  );
}
