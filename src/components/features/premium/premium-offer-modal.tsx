"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PREMIUM_PLANS, PURCHASABLE_PLAN_KEYS, type PremiumPlanKey } from "@/domain/premium-plans";
import { Crown } from "lucide-react";

interface PremiumOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (key: PremiumPlanKey) => void;
}

/**
 * Contenu partagé par les deux popups de relance Premium (accueil, une
 * seule fois ; Découvrir, à chaque chargement — cf. premium-welcome-nudge.tsx
 * et discover/page.tsx) : mêmes explications, mêmes formules cliquables.
 * Seule la logique de déclenchement diffère entre les deux usages.
 */
export function PremiumOfferModal({ isOpen, onClose, onSelectPlan }: PremiumOfferModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Découvre tout Agapeo" maxWidth="sm">
      <div className="flex flex-col gap-4 py-1">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-full bg-primary/10 text-primary shrink-0">
            <Crown size={20} />
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Sur Agapeo, un abonnement Premium te permet de consulter les profils en entier, démarrer des
            conversations, voir qui s&apos;intéresse à toi et utiliser les filtres avancés. Sans lui, ton
            exploration reste très limitée.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {PURCHASABLE_PLAN_KEYS.map((key) => {
            const plan = PREMIUM_PLANS[key];
            return (
              <Button key={key} variant="outline" className="w-full justify-between" onClick={() => onSelectPlan(key)}>
                <span>{plan.label}</span>
                <span className="font-semibold">{plan.priceFcfaLabel}</span>
              </Button>
            );
          })}
        </div>
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Quitter maintenant
        </Button>
      </div>
    </Modal>
  );
}
