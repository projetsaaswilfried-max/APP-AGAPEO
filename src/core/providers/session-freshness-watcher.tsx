"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SessionProfile } from "@/lib/supabase/session";

/**
 * Le profil de session est un instantané rendu côté serveur à l'entrée dans
 * l'espace membre (cf. (dashboard)/layout.tsx) ; toutes les navigations
 * internes réutilisent ce même instantané sans repasser par le layout. Un
 * changement de droits survenu AILLEURS restait donc invisible jusqu'à un
 * rechargement complet de la page :
 *
 *  - paiement réglé sur la page hébergée du prestataire (Chariow/SasPay),
 *    puis retour sur l'onglet Agapeo resté ouvert — le cas le plus fréquent,
 *    et le plus coûteux : le membre venait de payer et l'interface continuait
 *    à lui proposer « Passe Premium » sur toutes les pages ;
 *  - photo validée (ou refusée) par l'équipe pendant que le membre est en
 *    ligne — les interactions restaient bloquées côté base alors que rien ne
 *    l'expliquait à l'écran ;
 *  - abonnement arrivé à échéance ou retiré par l'administration.
 *
 * Ce veilleur relit uniquement les deux champs qui ouvrent ou ferment des
 * fonctionnalités, au retour sur l'onglet (l'instant exact du retour de
 * paiement) puis à intervalle lent tant que l'onglet reste visible, et ne
 * déclenche `router.refresh()` que s'ils ont réellement changé — le layout
 * est alors re-rendu côté serveur et toute l'interface repart des bons
 * droits, sans que le membre ait quoi que ce soit à faire.
 */
const POLL_INTERVAL_MS = 60 * 1000;
/**
 * Un `router.refresh()` est asynchrone : sans ce délai de garde, un contrôle
 * déclenché entre-temps (reprise de focus, tic du minuteur) verrait encore
 * l'ancien instantané et relancerait un refresh, en boucle.
 */
const REFRESH_COOLDOWN_MS = 10 * 1000;

interface SessionFreshnessWatcherProps {
  userId: string;
  subscriptionStatus: SessionProfile["subscription_status"];
  photoVerificationStatus: SessionProfile["photo_verification_status"];
  /**
   * Mode aperçu de l'équipe : le profil affiché est volontairement réécrit
   * (cf. requireMemberViewSession), il diverge donc en permanence de la base
   * — surveiller reviendrait à rafraîchir sans fin.
   */
  disabled?: boolean;
}

export function SessionFreshnessWatcher({
  userId,
  subscriptionStatus,
  photoVerificationStatus,
  disabled = false
}: SessionFreshnessWatcherProps) {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);

  const check = useCallback(async () => {
    const supabase = createClient();
    const [{ data: restricted }, { data: publicProfile }] = await Promise.all([
      supabase.from("profile_restricted").select("subscription_status").eq("id", userId).maybeSingle(),
      supabase.from("profiles").select("photo_verification_status").eq("id", userId).maybeSingle()
    ]);

    const subscriptionChanged = restricted != null && restricted.subscription_status !== subscriptionStatus;
    const verificationChanged = publicProfile != null && publicProfile.photo_verification_status !== photoVerificationStatus;
    if (!subscriptionChanged && !verificationChanged) return;

    const now = Date.now();
    if (now - lastRefreshAtRef.current < REFRESH_COOLDOWN_MS) return;
    lastRefreshAtRef.current = now;
    router.refresh();
  }, [photoVerificationStatus, router, subscriptionStatus, userId]);

  useEffect(() => {
    if (disabled) return;

    const checkIfVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    document.addEventListener("visibilitychange", checkIfVisible);
    window.addEventListener("focus", checkIfVisible);
    const interval = setInterval(checkIfVisible, POLL_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", checkIfVisible);
      window.removeEventListener("focus", checkIfVisible);
      clearInterval(interval);
    };
  }, [check, disabled]);

  return null;
}
