"use client";

import { useSession } from "@/core/providers/session-provider";
import { SupportPageClient } from "@/components/features/support/support-page-client";
import { CalendlyBookingWidget } from "@/components/features/support/calendly-booking-widget";
import { AccessExpiredState } from "@/components/features/premium/access-expired-state";
import { PhoneCall } from "lucide-react";

export default function SupportPage() {
  const { profile } = useSession();
  const isExpired = profile.subscription_status === "EXPIRED" && !profile.is_staff;

  return (
    <div className="space-y-4 w-full h-full flex flex-col pb-4">
      <div className="border-b border-border/60 pb-3">
        <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">Support</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Une question, un souci ? Ouvre un dossier, l&apos;équipe Agapeo te répond directement dedans.</p>
      </div>

      {/* Mis en avant au-dessus des dossiers texte, et jamais derrière le
          paywall EXPIRED ci-dessous : un problème d'abonnement (accès payé
          non activé, etc.) est justement l'un des cas visés en premier —
          restreindre ce canal aux mêmes comptes qui en ont besoin n'aurait
          aucun sens. Ancre #reserver-un-appel visée par le message interne
          et l'email annonçant ce nouveau canal. */}
      <div id="reserver-un-appel" className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 scroll-mt-20">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <PhoneCall size={17} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Réserve un appel avec notre équipe</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Un souci avec ton abonnement, ton compte, ta soumission de profil... quel que soit le problème, choisis un créneau qui t&apos;arrange et on le règle ensemble, en direct.
            </p>
          </div>
        </div>
        <CalendlyBookingWidget />
      </div>

      <div className="flex-1 min-h-[70dvh]">
        {/* Restriction paywall (compte EXPIRED, jamais FREE) — cf. plan paywall §6. */}
        {isExpired ? <AccessExpiredState feature="support" /> : <SupportPageClient />}
      </div>
    </div>
  );
}
