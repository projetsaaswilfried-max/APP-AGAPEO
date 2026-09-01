"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Crown, LockKeyhole } from "lucide-react";

type AccessExpiredFeature = "discover" | "messages" | "support";

const FEATURE_DESCRIPTIONS: Record<AccessExpiredFeature, string> = {
  discover: "Réactive ton accès pour continuer à découvrir de nouveaux profils.",
  messages: "Réactive ton accès pour consulter et envoyer des messages.",
  support: "Réactive ton accès pour contacter le support."
};

interface AccessExpiredStateProps {
  feature: AccessExpiredFeature;
  className?: string;
}

/** Bloque l'accès à une fonctionnalité pour un compte EXPIRED (jamais FREE, cf. plan paywall) — pendant du modal PremiumRequiredModal, mais pour un accès en pleine page plutôt qu'une action ponctuelle. */
export function AccessExpiredState({ feature, className }: AccessExpiredStateProps) {
  return (
    <EmptyState
      icon={<LockKeyhole size={22} />}
      title="Ton accès a expiré"
      description={FEATURE_DESCRIPTIONS[feature]}
      action={
        <Link href="/premium">
          <Button variant="primary" leftIcon={<Crown size={15} />}>
            Réactiver mon accès
          </Button>
        </Link>
      }
      className={className}
    />
  );
}
