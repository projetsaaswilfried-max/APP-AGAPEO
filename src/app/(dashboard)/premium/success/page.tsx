"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Crown } from "lucide-react";
import { trackMetaEventOnce } from "@/lib/meta-pixel";
import { PREMIUM_PLANS, planKeyFromDbValue } from "@/domain/premium-plans";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 10;

export default function PremiumSuccessPage() {
  const [status, setStatus] = useState<"waiting" | "active" | "timeout">("waiting");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("profile_restricted")
        .select("subscription_status, subscription_plan, subscription_current_period_end")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (data?.subscription_status === "ACTIVE") {
        setStatus("active");
        // Déduplication sur user + échéance de la période payée : un même
        // achat garde la même date de fin, donc revisiter cette page (retour
        // arrière, favori) sans nouveau paiement ne redéclenche jamais
        // l'évènement — seul un vrai nouvel achat (nouvelle échéance) le fera.
        const planKey = planKeyFromDbValue(data.subscription_plan);
        if (planKey && data.subscription_current_period_end) {
          trackMetaEventOnce("Purchase", `${user.id}:${data.subscription_current_period_end}`, {
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
                  Ton paiement a bien été reçu, on active ton accès Premium — quelques secondes suffisent.
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
                <h1 className="text-base font-display font-semibold text-foreground">Bienvenue dans Premium !</h1>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Ton accès Premium Agapeo est actif. Profite de tous tes nouveaux avantages dès maintenant.
                </p>
              </div>
              <Link href="/discover">
                <Button variant="primary" size="lg" leftIcon={<Crown size={16} />}>
                  Découvrir des profils
                </Button>
              </Link>
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
                  Ton paiement a été reçu et ton accès s&apos;active généralement en quelques instants. Si ce n&apos;est pas encore
                  le cas depuis ton profil, contacte le support.
                </p>
              </div>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
