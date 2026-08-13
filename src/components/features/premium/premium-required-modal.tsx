"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

interface PremiumRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Décrit ce que l'action débloquée permet, ex. "contacter ce membre en premier". */
  reason: string;
}

export function PremiumRequiredModal({ isOpen, onClose, reason }: PremiumRequiredModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fonctionnalité Premium" maxWidth="sm">
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <Crown size={24} />
        </div>
        <p className="text-sm text-foreground">Passe Premium pour {reason}.</p>
        <Link href="/premium" className="w-full pt-2" onClick={onClose}>
          <Button variant="primary" className="w-full" leftIcon={<Crown size={15} />}>
            Découvrir Premium
          </Button>
        </Link>
      </div>
    </Modal>
  );
}
