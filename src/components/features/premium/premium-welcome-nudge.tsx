"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/core/providers/session-provider";
import { isProfileComplete, needsVerificationSubmission } from "@/domain/profile-completeness";
import { PremiumOfferModal } from "./premium-offer-modal";
import type { PremiumPlanKey } from "@/domain/premium-plans";

const STORAGE_KEY = "agapeo:premium-welcome-nudge-shown";

/**
 * Popup de bienvenue Premium — montré UNE SEULE FOIS, jamais revu ensuite,
 * dès qu'un membre gratuit arrive sur Accueil (/feed, généralement la
 * première page vue après connexion). Contrairement au popup de Découvrir
 * (cf. discover/page.tsx), qui s'affiche à chaque chargement sans limite,
 * celui-ci est ponctuel : une bonne première impression, pas une relance.
 */
export function PremiumWelcomeNudge() {
  const { profile } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Même suppression que PremiumUpsellBanner : inutile tant que le profil
  // n'est pas complet/vérifié, ce n'est pas encore le bon moment.
  const eligible =
    !profile.is_staff &&
    profile.subscription_status !== "ACTIVE" &&
    isProfileComplete(profile) &&
    !needsVerificationSubmission(profile);

  useEffect(() => {
    if (!eligible || pathname !== "/feed") return;

    let alreadyShown = true;
    try {
      alreadyShown = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      alreadyShown = false;
    }
    if (alreadyShown) return;

    setIsOpen(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Stockage indisponible (navigation privée, quota...) — tant pis, le
      // popup pourra réapparaître pour cette personne.
    }
  }, [eligible, pathname]);

  if (!eligible) return null;

  const handleSelectPlan = (key: PremiumPlanKey) => {
    setIsOpen(false);
    router.push(`/premium?plan=${key}`);
  };

  return <PremiumOfferModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSelectPlan={handleSelectPlan} />;
}
