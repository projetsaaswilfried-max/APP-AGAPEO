"use client";

import Script from "next/script";

const CALENDLY_URL = "https://calendly.com/agapeo-love/call-avec-l-equipe-agapeo-pour-regler-vos-problemes";

/**
 * Widget Calendly officiel (embed inline) — le script, chargé une seule fois
 * pour toute la page, cherche lui-même le <div class="calendly-inline-widget">
 * ci-dessous et y injecte le calendrier. lazyOnload : jamais prioritaire sur
 * le chargement de la page elle-même, cf. l'audit vitesse de ce mois-ci.
 */
export function CalendlyBookingWidget() {
  return (
    <>
      <div className="calendly-inline-widget" data-url={CALENDLY_URL} style={{ minWidth: 320, height: 700 }} />
      <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" />
    </>
  );
}
