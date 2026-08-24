"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

/**
 * Affiché sur Accueil tant que l'onboarding n'est pas terminé — un membre
 * accède désormais directement à son interface après inscription (plus de
 * redirection forcée vers /onboarding, cf. (dashboard)/layout.tsx) : ce
 * bandeau reste la seule invitation à finaliser son profil.
 */
export function OnboardingProgressBanner() {
  return (
    <Card variant="base" className="p-5 border-accent/30 bg-accent/5 shadow-2xs space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-accent shrink-0">
          <CheckCircle2 size={16} />
          <span>Étape 1/2 — Compte créé</span>
        </div>
        <div className="flex-1 h-px bg-border/60" />
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
          <Circle size={16} />
          <span>Étape 2/2 — Profil à valider</span>
        </div>
      </div>
      <p className="text-sm text-foreground">
        Complète ton profil (photos, foi, personnalité, vision du mariage...) pour apparaître dans Découvrir et pouvoir contacter les
        autres membres.
      </p>
      <Link href="/onboarding">
        <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
          Valider mon profil
        </Button>
      </Link>
    </Card>
  );
}
