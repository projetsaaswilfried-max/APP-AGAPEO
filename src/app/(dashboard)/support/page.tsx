"use client";

import { SupportPageClient } from "@/components/features/support/support-page-client";
import { buildSupportWhatsAppUrl, SUPPORT_WHATSAPP_DISPLAY } from "@/config/support";
import { IS_SUPPORT_AGENT_ENABLED } from "@/config/support-agent";
import { Headset, Zap, ShieldCheck, MessageCircle, Clock } from "lucide-react";

/**
 * Point d'entrée du support. Deux états, selon l'interrupteur
 * `NEXT_PUBLIC_SUPPORT_AGENT_ENABLED` (cf. config/support-agent.ts) :
 *
 *  - ouvert : l'assistant Agapeo, qui répond dans l'espace membre et agit
 *    directement sur le compte (ouverture d'un accès payé mais non crédité,
 *    correction de genre ou de date de naissance) avant de passer la main à
 *    l'équipe quand il ne peut pas conclure ;
 *  - fermé (le défaut) : WhatsApp, comme avant, pour qu'aucun membre ne se
 *    retrouve sans canal si l'assistant n'est pas encore prêt.
 *
 * Le bouton n'ouvre pas une seconde conversation : il déclenche le panneau
 * monté pour tout l'espace membre (SupportAgentWidget), de sorte qu'il n'y a
 * qu'un fil, retrouvable de partout. Aucun garde d'abonnement ici : un
 * problème de paiement est justement l'une des raisons d'écrire.
 */
export default function SupportPage() {
  return (
    <div className="space-y-4 w-full pb-16 select-none">
      <div className="border-b border-border/60 pb-3">
        <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">Aide</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {IS_SUPPORT_AGENT_ENABLED
            ? "Explique ton souci, on regarde ton compte et on le règle."
            : "Un souci ? Écris-nous sur WhatsApp, on te répond directement."}
        </p>
      </div>

      {IS_SUPPORT_AGENT_ENABLED ? <AssistantCard /> : <WhatsAppCard />}

      {/* Dossiers déjà ouverts — dont ceux ouverts par la modération pour
          demander une explication, auxquels le membre doit pouvoir répondre. */}
      <SupportPageClient />
    </div>
  );
}

function AssistantCard() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 text-center space-y-5 max-w-lg mx-auto">
      <div className="h-14 w-14 rounded-full bg-accent-subtle text-primary flex items-center justify-center mx-auto">
        <Headset size={26} />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-base font-semibold text-foreground">Ouvrir une conversation</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Abonnement, paiement, validation de ta photo, informations de ton profil... raconte ce qui se passe. On consulte ton compte
          directement et, si c&apos;est de notre côté, on le corrige tout de suite.
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("agapeo:open-support"))}
        className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
      >
        <Headset size={17} /> Demander de l&apos;aide
      </button>

      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
        <span className="flex items-center justify-center gap-1.5 flex-1">
          <Zap size={13} className="shrink-0" /> Réponse immédiate
        </span>
        <span className="flex items-center justify-center gap-1.5 flex-1">
          <ShieldCheck size={13} className="shrink-0" /> Un humain reprend si besoin
        </span>
      </div>
    </div>
  );
}

function WhatsAppCard() {
  const whatsappUrl = buildSupportWhatsAppUrl("GENERAL");

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 text-center space-y-5 max-w-lg mx-auto">
      <div className="h-14 w-14 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center mx-auto">
        <MessageCircle size={26} />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-base font-semibold text-foreground">Écris-nous sur WhatsApp</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Abonnement, paiement, vérification de profil, compte bloqué... quel que soit ton problème, explique-le nous en message et on le
          règle avec toi.
        </p>
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-[#25D366] text-white text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
      >
        <MessageCircle size={17} /> Ouvrir la conversation
      </a>

      <p className="text-[11px] text-muted-foreground">{SUPPORT_WHATSAPP_DISPLAY}</p>

      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
        <span className="flex items-center justify-center gap-1.5 flex-1">
          <Clock size={13} className="shrink-0" /> Réponse rapide
        </span>
        <span className="flex items-center justify-center gap-1.5 flex-1">
          <ShieldCheck size={13} className="shrink-0" /> Équipe Agapeo officielle
        </span>
      </div>
    </div>
  );
}
