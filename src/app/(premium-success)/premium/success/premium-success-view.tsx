"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Crown, UserCog } from "lucide-react";
import { trackMetaEventOnce } from "@/lib/meta-pixel";
import { PREMIUM_PLANS, planKeyFromDbValue } from "@/domain/premium-plans";
import { getSessionUser } from "@/lib/supabase/session-user";
import { clearPaymentPending, markPaymentPending } from "@/domain/payment-intent";

const POLL_INTERVAL_MS = 3000;
/**
 * Trois minutes d'attente. L'ancienne limite — 10 essais de 2 s, soit 20 s —
 * était PLUS COURTE que le délai d'activation réel : mesuré le 2026-11-11 sur
 * les 762 paiements SasPay (Mobile Money) des 60 derniers jours, la médiane
 * est de 46 s et le 9e décile de 106 s. La majorité des payeurs voyaient donc
 * « contacte le support » alors que leur accès arrivait quelques secondes plus
 * tard. (Chariow, lui, active en moins d'une seconde : cette attente ne le
 * concerne pas.)
 */
const MAX_ATTEMPTS = 60;
/** Adresse de contact PUBLIQUE affichée aux membres — cf. (auth)/suspended/page.tsx. */
const SUPPORT_EMAIL = "support@agapeo.love";

interface PremiumSuccessViewProps {
  onboardingCompleted: boolean;
}

export function PremiumSuccessView({ onboardingCompleted }: PremiumSuccessViewProps) {
  const [status, setStatus] = useState<"waiting" | "active" | "timeout">("waiting");

  useEffect(() => {
    // Le membre attend une activation : tant qu'elle n'est pas arrivée, tout
    // l'espace membre relit ses droits toutes les 3 s au lieu d'une fois par
    // minute (cf. useRightsFreshness), y compris s'il quitte cette page avant
    // la fin de l'attente.
    markPaymentPending();

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      const supabase = createClient();
      const {
        data: { user }
      } = await getSessionUser(supabase);
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("profile_restricted")
        .select("subscription_status, subscription_plan, subscription_current_period_end")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (data?.subscription_status === "ACTIVE") {
        setStatus("active");
        clearPaymentPending();
        // Déduplication sur user + échéance de la période payée : un même
        // achat garde la même date de fin, donc revisiter cette page (retour
        // arrière, favori) sans nouveau paiement ne redéclenche jamais
        // l'évènement — seul un vrai nouvel achat (nouvelle échéance) le fera.
        // Secondes epoch (pas la chaîne ISO brute) pour matcher exactement
        // l'eventId calculé côté webhook Chariow malgré des sérialisations
        // de date potentiellement différentes entre les deux.
        const planKey = planKeyFromDbValue(data.subscription_plan);
        if (planKey && data.subscription_current_period_end) {
          const epochSeconds = Math.floor(new Date(data.subscription_current_period_end).getTime() / 1000);
          trackMetaEventOnce("Purchase", `${user.id}:${epochSeconds}`, {
            value: PREMIUM_PLANS[planKey].priceUsd,
            currency: "USD"
          });
        }
        return;
      }

      attempts += 1;
      if (attempts >= MAX_ATTEMPTS) {
        setStatus("timeout");
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto py-10">
      <Card variant="base">
        <CardContent className="flex flex-col items-center text-center gap-4 py-12">
          {status === "waiting" && (
            <>
              <div className="p-3 rounded-full bg-accent-subtle/60 text-primary">
                <Loader2 size={28} className="animate-spin" />
              </div>
              <div>
                <h1 className="text-base font-display font-semibold text-foreground">Activation en cours...</h1>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Ton paiement a bien été reçu, on active ton accès : quelques secondes suffisent.
                </p>
              </div>
            </>
          )}

          {status === "active" && (
            <>
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h1 className="text-base font-display font-semibold text-foreground">
                  {onboardingCompleted ? "Bienvenue dans Premium !" : "Paiement confirmé !"}
                </h1>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {onboardingCompleted
                    ? "Ton accès Premium Agapeo est actif. Profite de tous tes nouveaux avantages dès maintenant."
                    : "Ton accès est actif. Complète maintenant ton profil pour commencer ta recherche."}
                </p>
                {/* Le paiement depuis l'app mobile se règle dans le navigateur
                    externe (cf. passerelle mobile-payment-handoff) : l'app,
                    elle, doit relire l'abonnement pour s'en apercevoir. */}
                <p className="text-[11px] text-muted-foreground/80 mt-2 max-w-xs">
                  Tu utilises l&apos;application Agapeo ? Si ton accès n&apos;y apparaît pas tout de suite, ferme-la complètement
                  et rouvre-la.
                </p>
              </div>
              {onboardingCompleted ? (
                <Link href="/discover">
                  <Button variant="primary" size="lg" leftIcon={<Crown size={16} />}>
                    Découvrir des profils
                  </Button>
                </Link>
              ) : (
                <Link href="/onboarding">
                  <Button variant="primary" size="lg" leftIcon={<UserCog size={16} />}>
                    Compléter mon profil
                  </Button>
                </Link>
              )}
            </>
          )}

          {status === "timeout" && (
            <>
              <div className="p-3 rounded-full bg-secondary text-muted-foreground">
                <Loader2 size={28} />
              </div>
              <div>
                <h1 className="text-base font-display font-semibold text-foreground">Activation en cours</h1>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Ton paiement a bien été reçu. Pour un paiement Mobile Money, l&apos;activation peut prendre quelques minutes
                  de plus : laisse cette page ouverte ou reviens dans un instant, ton accès s&apos;ouvrira tout seul. S&apos;il
                  n&apos;est toujours pas là d&apos;ici une dizaine de minutes, écris-nous.
                </p>
              </div>
              {onboardingCompleted ? (
                <div className="flex items-center gap-2">
                  <Link href="/premium">
                    <Button variant="outline" size="sm">
                      Voir mon plan
                    </Button>
                  </Link>
                  <Link href="/support">
                    <Button variant="ghost" size="sm">
                      Contacter le support
                    </Button>
                  </Link>
                </div>
              ) : (
                // Pas encore onboardé : /premium et /support exigent un accès déjà
                // actif (cf. requireSession()) et renverraient ici même en boucle —
                // un lien mailto direct reste toujours joignable, quel que soit l'état du compte.
                <a href={`mailto:${SUPPORT_EMAIL}`}>
                  <Button variant="ghost" size="sm">
                    Contacter le support
                  </Button>
                </a>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
