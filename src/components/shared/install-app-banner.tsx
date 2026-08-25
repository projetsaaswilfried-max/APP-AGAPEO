"use client";

import { Smartphone } from "lucide-react";
import { useInstallAvailability } from "@/core/hooks/use-install-availability";
import { InstallAppButton } from "./install-app-button";

/**
 * Bandeau toujours visible en haut de "Mon Profil", quel que soit l'onglet
 * actif — contrairement à une carte cachée dans un onglet précis (l'ancien
 * emplacement, dans "Mon Compte & Sécurité"), personne ne peut le manquer en
 * arrivant sur la page.
 *
 * Empilé proprement sur mobile (icône+texte, puis bouton pleine largeur) au
 * lieu de compter sur `flex-wrap` : avec `min-w-0` sur le bloc de texte, le
 * navigateur préfère écraser le texte à une largeur minuscule plutôt que de
 * passer le bouton à la ligne — `sm:contents` réunit icône+texte dans leur
 * propre ligne sur mobile, puis les "dissout" pour revenir à une seule ligne
 * avec le bouton à partir de `sm`.
 */
export function InstallAppBanner() {
  const { available } = useInstallAvailability();
  if (!available) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-3xl bg-accent-subtle/80 border border-accent/20 px-5 py-4 sm:py-3.5 shadow-soft select-none">
      <div className="flex items-center gap-3 sm:contents">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shrink-0 shadow-accent-glow">
          <Smartphone size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Installe Agapeo sur ton appareil</p>
          <p className="text-xs text-muted-foreground">Accède à Agapeo en un geste, comme une vraie application.</p>
        </div>
      </div>
      <InstallAppButton className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-95 transition-opacity rounded-full px-4 py-2.5 sm:py-2 w-full sm:w-auto shrink-0 shadow-accent-glow" />
    </div>
  );
}
