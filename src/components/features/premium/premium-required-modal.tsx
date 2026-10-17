"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Heart, X } from "lucide-react";
import { PREMIUM_PLANS } from "@/domain/premium-plans";

interface PremiumRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Décrit ce que l'action débloquée permet, ex. "contacter ce membre en premier". */
  reason: string;
}

/** Sur mobile, présenté comme une feuille glissant depuis le bas (format app native : tous les interstitiels Premium y sont des bottom sheets) — desktop garde la modale centrée existante. */
export function PremiumRequiredModal({ isOpen, onClose, reason }: PremiumRequiredModalProps) {
  // Message centré sur la rencontre (pas sur la fonctionnalité) ; `reason` rappelle juste ce qui a été tenté.
  const content = (
    <>
      <div className="w-12 h-12 rounded-full bg-accent-subtle text-primary flex items-center justify-center">
        <Heart size={22} className="fill-current" />
      </div>
      <p className="text-sm text-foreground leading-relaxed">
        Pour {reason}, passe Premium. Des célibataires chrétiens sérieux attendent eux aussi la bonne personne :
        consulte leurs profils, écris à ceux qui te touchent, et donne enfin sa chance à ta rencontre.
      </p>
      <Link href="/premium" className="w-full pt-2" onClick={onClose}>
        <Button variant="primary" className="w-full" leftIcon={<Heart size={15} />}>
          Passer Premium · {PREMIUM_PLANS.MONTHLY.priceFcfaLabel}/mois
        </Button>
      </Link>
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
                  <h3 className="text-base font-display font-semibold text-foreground tracking-tight">Ta rencontre est peut-être à un clic</h3>
                  <button onClick={onClose} className="p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground rounded-full" aria-label="Fermer">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex flex-col items-center text-center gap-3 pt-3">{content}</div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop : modale centrée inchangée. */}
      <div className="hidden md:block">
        <Modal isOpen={isOpen} onClose={onClose} title="Ta rencontre est peut-être à un clic" maxWidth="sm">
          <div className="flex flex-col items-center text-center gap-3 py-2">{content}</div>
        </Modal>
      </div>
    </>
  );
}
