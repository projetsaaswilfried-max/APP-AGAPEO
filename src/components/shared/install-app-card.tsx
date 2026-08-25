"use client";

import { Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useInstallAvailability } from "@/core/hooks/use-install-availability";
import { InstallAppButton } from "./install-app-button";

/** Toute la carte apparaît/disparaît avec le bouton — jamais un titre affiché à côté d'un bouton absent. */
export function InstallAppCard() {
  const { available } = useInstallAvailability();
  if (!available) return null;

  return (
    <Card variant="base" className="p-6 space-y-4 border-border/60 shadow-2xs">
      <div className="flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground tracking-tight">Installer l&apos;application</h3>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Selon ton appareil</h4>
          <p className="text-xs text-muted-foreground">
            Ajoute Agapeo à ton écran d&apos;accueil ou ton bureau, comme une vraie application.
          </p>
        </div>
        <InstallAppButton className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-95 transition-opacity shrink-0" />
      </div>
    </Card>
  );
}
