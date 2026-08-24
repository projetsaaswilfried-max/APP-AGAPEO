"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

interface VerificationRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Décrit ce que l'action débloquée permet, ex. "contacter ce membre". */
  reason: string;
}

export function VerificationRequiredModal({ isOpen, onClose, reason }: VerificationRequiredModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profil non vérifié" maxWidth="sm">
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <ShieldCheck size={24} />
        </div>
        <p className="text-sm text-foreground">
          Valide d&apos;abord ton profil pour {reason}. Tu peux continuer à découvrir un aperçu des membres en attendant.
        </p>
        <Link href="/profile?tab=account" className="w-full pt-2" onClick={onClose}>
          <Button variant="primary" className="w-full" leftIcon={<ShieldCheck size={15} />}>
            Vérifier mon profil
          </Button>
        </Link>
      </div>
    </Modal>
  );
}
