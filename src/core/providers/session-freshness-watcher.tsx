"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SessionProfile } from "@/lib/supabase/session";
import { clearPaymentPending, isPaymentPending } from "@/domain/payment-intent";

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
 * Trois déclencheurs, du plus rapide au plus lent :
 *
 *  1. le temps réel Postgres sur la ligne `profile_restricted` du membre
 *     (migration publish_profile_restricted_realtime) — l'activation se voit
 *     en une seconde, sans rien sonder ;
 *  2. le retour sur l'onglet (`visibilitychange`/`focus`), c'est-à-dire
 *     l'instant exact du retour de paiement ;
 *  3. un sondage, rapide (3 s) tant qu'un paiement est en attente dans cet
 *     onglet, lent (60 s) sinon — filet de sécurité si la connexion temps
 *     réel est bloquée (réseau d'entreprise, navigateur restrictif).
 *
 * Les droits relus sont ensuite SERVIS DIRECTEMENT par SessionProvider, en
 * plus de déclencher un `router.refresh()` : l'interface est corrigée dès la
 * réponse de la base, sans attendre le re-rendu serveur.
 */
const IDLE_POLL_INTERVAL_MS = 60 * 1000;
/** Rythme pendant la fenêtre d'activation d'un paiement (cf. payment-intent). */
const AWAITING_PAYMENT_POLL_INTERVAL_MS = 3 * 1000;
/** Cadence du minuteur ; c'est chaque tic qui décide s'il est temps de relire. */
const TICK_MS = 1000;
/**
 * Un `router.refresh()` est asynchrone : sans ce délai de garde, un contrôle
 * déclenché entre-temps (reprise de focus, tic du minuteur) verrait encore
 * l'ancien instantané et relancerait un refresh, en boucle.
 */
const REFRESH_COOLDOWN_MS = 10 * 1000;

type SubscriptionStatus = SessionProfile["subscription_status"];
type PhotoVerificationStatus = SessionProfile["photo_verification_status"];

interface RightsFreshnessInput {
  userId: string;
  /** Droits tels que le serveur vient de les rendre — ils font foi au départ. */
  subscriptionStatus: SubscriptionStatus;
  photoVerificationStatus: PhotoVerificationStatus;
  /**
   * Mode aperçu de l'équipe : le profil affiché est volontairement réécrit
   * (cf. requireMemberViewSession), il diverge donc en permanence de la base
   * — surveiller reviendrait à rafraîchir sans fin.
   */
  disabled?: boolean;
}

export interface RightsFreshness {
  /** Valeurs lues en base, ou `null` tant qu'aucune lecture n'a abouti. */
  subscriptionStatus: SubscriptionStatus | null;
  photoVerificationStatus: PhotoVerificationStatus | null;
  /**
   * Vrai dès que les droits ont été confirmés en base au moins une fois dans
   * cet onglet. Tout ce qui REPROCHE au membre de ne pas être abonné (popups
   * et bandeaux de paiement qui s'ouvrent d'eux-mêmes) doit attendre ce
   * drapeau : sinon un membre qui vient de payer se voit proposer de payer.
   */
  verified: boolean;
}

/**
 * Relit les deux champs qui ouvrent ou ferment des fonctionnalités et signale
 * tout écart avec l'instantané serveur. Utilisé par SessionProvider pour tout
 * l'espace membre, et par la page de paywall qui n'a pas de provider.
 */
export function useRightsFreshness({
  userId,
  subscriptionStatus,
  photoVerificationStatus,
  disabled = false
}: RightsFreshnessInput): RightsFreshness {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);
  const lastCheckAtRef = useRef(0);
  const [live, setLive] = useState<{ subscriptionStatus: SubscriptionStatus; photoVerificationStatus: PhotoVerificationStatus } | null>(null);

  const check = useCallback(async () => {
    lastCheckAtRef.current = Date.now();
    const supabase = createClient();
    const [{ data: restricted }, { data: publicProfile }] = await Promise.all([
      supabase.from("profile_restricted").select("subscription_status").eq("id", userId).maybeSingle(),
      supabase.from("profiles").select("photo_verification_status").eq("id", userId).maybeSingle()
    ]);
    if (!restricted || !publicProfile) return;

    // L'activation est arrivée : plus la peine de sonder au rythme rapide.
    if (restricted.subscription_status === "ACTIVE") clearPaymentPending();

    // Même objet retourné quand rien n'a bougé : React abandonne alors le
    // rendu, sinon chaque relecture (toutes les 3 s pendant l'attente d'un
    // paiement) ferait re-rendre tout l'espace membre pour rien.
    setLive((prev) =>
      prev &&
      prev.subscriptionStatus === restricted.subscription_status &&
      prev.photoVerificationStatus === publicProfile.photo_verification_status
        ? prev
        : {
            subscriptionStatus: restricted.subscription_status,
            photoVerificationStatus: publicProfile.photo_verification_status
          }
    );

    const subscriptionChanged = restricted.subscription_status !== subscriptionStatus;
    const verificationChanged = publicProfile.photo_verification_status !== photoVerificationStatus;
    if (!subscriptionChanged && !verificationChanged) return;

    const now = Date.now();
    if (now - lastRefreshAtRef.current < REFRESH_COOLDOWN_MS) return;
    lastRefreshAtRef.current = now;
    router.refresh();
  }, [photoVerificationStatus, router, subscriptionStatus, userId]);

  // Référence toujours à jour, pour que les abonnements ci-dessous n'aient pas
  // à se reconstruire (et le canal temps réel à se réabonner) chaque fois que
  // les droits rendus par le serveur changent.
  const checkRef = useRef(check);
  useEffect(() => {
    checkRef.current = check;
  }, [check]);

  // Le serveur vient de rendre de nouvelles valeurs (refresh, navigation
  // complète, reconnexion) : elles font foi et remplacent ce qui avait été lu
  // avant — sans quoi une lecture devenue obsolète pourrait RETIRER à l'écran
  // un droit que le serveur vient d'accorder. On les reconfirme aussitôt,
  // pour ne pas laisser `verified` à faux (et donc les relances Premium
  // masquées) jusqu'au prochain tic du minuteur. Volontairement après la
  // synchronisation de `checkRef` ci-dessus : la relecture doit se comparer
  // aux NOUVELLES valeurs serveur, pas aux précédentes.
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    setLive(null);
    void checkRef.current();
  }, [subscriptionStatus, photoVerificationStatus]);

  useEffect(() => {
    if (disabled) return;

    const runCheck = () => {
      void checkRef.current();
    };
    const checkIfVisible = () => {
      if (document.visibilityState === "visible") runCheck();
    };

    // Premier contrôle immédiat : c'est lui qui confirme les droits affichés
    // (`verified`) et qui rattrape une activation survenue juste avant
    // l'ouverture de la page.
    runCheck();

    document.addEventListener("visibilitychange", checkIfVisible);
    window.addEventListener("focus", checkIfVisible);

    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const due = isPaymentPending() ? AWAITING_PAYMENT_POLL_INTERVAL_MS : IDLE_POLL_INTERVAL_MS;
      if (Date.now() - lastCheckAtRef.current < due) return;
      runCheck();
    }, TICK_MS);

    // Temps réel : la ligne `profile_restricted` du membre n'est lisible que
    // par lui (RLS `profile_restricted_select_own`), l'activation remonte donc
    // en une seconde sans aucun sondage.
    const supabase = createClient();
    const channel = supabase
      .channel(`rights:${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profile_restricted", filter: `id=eq.${userId}` }, () => {
        runCheck();
      })
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", checkIfVisible);
      window.removeEventListener("focus", checkIfVisible);
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [disabled, userId]);

  if (disabled) {
    return { subscriptionStatus: null, photoVerificationStatus: null, verified: true };
  }
  return {
    subscriptionStatus: live?.subscriptionStatus ?? null,
    photoVerificationStatus: live?.photoVerificationStatus ?? null,
    verified: live !== null
  };
}

/**
 * Veilleur autonome, pour les pages hors espace membre qui n'ont pas de
 * SessionProvider (paywall d'entrée) : il ne sert qu'à provoquer le re-rendu
 * serveur, la page se redirigeant alors d'elle-même.
 */
export function SessionFreshnessWatcher(props: RightsFreshnessInput) {
  useRightsFreshness(props);
  return null;
}
