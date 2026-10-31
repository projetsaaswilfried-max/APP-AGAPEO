"use client";

import { buildSupportWhatsAppUrl, SUPPORT_WHATSAPP_DISPLAY } from "@/config/support";
import { SupportPageClient } from "@/components/features/support/support-page-client";
import { MessageCircle, Clock, ShieldCheck } from "lucide-react";

/**
 * Canal unique : WhatsApp. Les dossiers écrits et la réservation d'appel
 * Calendly ont été retirés (peu ou pas utilisés, cf. décision du fondateur) —
 * l'inbox admin reste en place pour consulter les anciens dossiers, mais les
 * membres n'en ouvrent plus de nouveaux. Aucun garde d'abonnement ici : un
 * problème de paiement est justement l'une des raisons d'écrire.
 */
export default function SupportPage() {
  const whatsappUrl = buildSupportWhatsAppUrl("GENERAL");

  return (
    <div className="space-y-4 w-full pb-16 select-none">
      <div className="border-b border-border/60 pb-3">
        <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">Aide</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Un souci ? Écris-nous sur WhatsApp, on te répond directement.</p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center space-y-5 max-w-lg mx-auto">
        <div className="h-14 w-14 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center mx-auto">
          <MessageCircle size={26} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">Écris-nous sur WhatsApp</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Abonnement, paiement, vérification de profil, compte bloqué... quel que soit ton problème, explique-le nous en message et on le règle
            avec toi.
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

      {/* Ne s'affiche que pour les membres ayant encore un dossier ouvert (dont
          ceux ouverts par l'équipe suite à un signalement) — invisible pour tous les autres. */}
      <SupportPageClient />
    </div>
  );
}
