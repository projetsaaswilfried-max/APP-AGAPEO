"use client";

import { Smartphone } from "lucide-react";
import { useInstallAvailability } from "@/core/hooks/use-install-availability";
import { InstallAppButton } from "./install-app-button";

/**
 * Bandeau toujours visible en haut de "Mon Profil", quel que soit l'onglet
 * actif — contrairement à une carte cachée dans un onglet précis (l'ancien
 * emplacement, dans "Mon Compte & Sécurité"), personne ne peut le manquer en
 * arrivant sur la page.
 */
export function InstallAppBanner() {
  const { available } = useInstallAvailability();
  if (!available) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-accent-subtle/80 border border-accent/20 px-5 py-3.5 shadow-soft select-none">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shrink-0 shadow-accent-glow">
        <Smartphone size={18} />
      </div>
      <div className="flex-1 min-w-0 sm:min-w-[220px]">
        <p className="text-sm font-semibold text-foreground">Installe Agapeo sur ton appareil</p>
        <p className="text-xs text-muted-foreground">Accède à Agapeo en un geste, comme une vraie application.</p>
      </div>
      <InstallAppButton className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-95 transition-opacity rounded-full px-4 py-2 shrink-0 shadow-accent-glow" />
    </div>
  );
}
