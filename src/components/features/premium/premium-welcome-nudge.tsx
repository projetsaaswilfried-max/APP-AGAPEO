"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/core/providers/session-provider";
import { PremiumOfferModal } from "./premium-offer-modal";
import type { PremiumPlanKey } from "@/domain/premium-plans";

const STORAGE_KEY = "agapeo:premium-welcome-nudge-shown";

/**
 * Popup de bienvenue Premium sur Accueil (/feed) — pour tout membre gratuit
 * (pas Premium, pas staff), sans autre condition : ni le profil complet ni
 * la vérification ne sont exigés, uniquement l'absence d'abonnement.
 * `sessionStorage` (pas `localStorage`) : réapparaît à chaque nouvelle
 * session (l'app rouverte après avoir été complètement quittée, ou une
 * reconnexion), mais pas à chaque fois que la personne revient sur Accueil
 * en continuant de naviguer dans la même session — Découvrir (cf.
 * discover/page.tsx) reste le seul endroit sans aucune limite.
 */
export function PremiumWelcomeNudge() {
  const { profile } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const eligible = !profile.is_staff && profile.subscription_status !== "ACTIVE";

  // "/" en plus de "/feed" : selon comment la personne arrive (connexion
  // sans redirectTo précis, ouverture directe de l'app...), l'accueil peut
  // se retrouver servi sous l'une ou l'autre URL — les deux comptent comme
  // "Accueil" pour ce popup.
  useEffect(() => {
    if (!eligible || (pathname !== "/feed" && pathname !== "/")) return;

    let alreadyShown = true;
    try {
      alreadyShown = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      alreadyShown = false;
    }
    if (alreadyShown) return;

    setIsOpen(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
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
