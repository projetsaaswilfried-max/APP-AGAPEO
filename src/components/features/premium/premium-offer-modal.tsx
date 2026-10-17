"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PREMIUM_PLANS, PURCHASABLE_PLAN_KEYS, type PremiumPlanKey } from "@/domain/premium-plans";
import { Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (key: PremiumPlanKey) => void;
}

const OFFER_TITLE = "Ta future moitié est peut-être déjà ici";

const explanation = (
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-full bg-accent-subtle text-primary flex items-center justify-center shrink-0">
      <Heart size={19} className="fill-current" />
    </div>
    <p className="text-sm text-foreground leading-relaxed">
      Un seul abonnement, et tout s&apos;ouvre : tu découvres chaque profil en entier, tu écris aux personnes qui te
      touchent, et tu peux enfin rencontrer celle ou celui avec qui bâtir ton foyer.
    </p>
  </div>
);

/**
 * Contenu partagé par les deux popups de relance Premium (accueil, une
 * seule fois ; Découvrir, à chaque chargement — cf. premium-welcome-nudge.tsx
 * et discover/page.tsx) : mêmes explications, mêmes formules cliquables.
 * Seule la logique de déclenchement diffère entre les deux usages. Sur
 * mobile, présenté en feuille glissant depuis le bas (format app native :
 * discover_premium_sheet.dart) — desktop garde la modale centrée existante.
 */
export function PremiumOfferModal({ isOpen, onClose, onSelectPlan }: PremiumOfferModalProps) {
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-display font-semibold text-foreground tracking-tight">{OFFER_TITLE}</h3>
                  <button onClick={onClose} className="p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground rounded-full" aria-label="Fermer">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  {explanation}
                  <div className="grid grid-cols-1 gap-2">
                    {PURCHASABLE_PLAN_KEYS.map((key) => {
                      const plan = PREMIUM_PLANS[key];
                      const isRecommended = key === "MONTHLY";
                      return (
                        <button
                          key={key}
                          onClick={() => onSelectPlan(key)}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 h-12 px-4 rounded-[12px] border text-sm font-medium transition-colors",
                            isRecommended ? "border-primary border-2 text-foreground" : "border-border text-foreground hover:bg-secondary"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {plan.label}
                            {isRecommended && (
                              <span className="text-[10px] font-semibold text-primary-foreground bg-primary px-1.5 py-0.5 rounded-full">
                                Recommandé
                              </span>
                            )}
                          </span>
                          <span className="font-semibold shrink-0">{plan.priceFcfaLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Button variant="ghost" className="w-full" onClick={onClose}>
                    Plus tard
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop : modale centrée inchangée. */}
      <div className="hidden md:block">
        <Modal isOpen={isOpen} onClose={onClose} title={OFFER_TITLE} maxWidth="sm">
          <div className="flex flex-col gap-4 py-1">
            {explanation}
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
              Plus tard
            </Button>
          </div>
        </Modal>
      </div>
    </>
  );
}
