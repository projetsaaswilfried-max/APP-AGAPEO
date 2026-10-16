"use client";

import { useEffect, useState } from "react";
import { usePwaInstall } from "@/core/providers/pwa-install-provider";
import { detectInstallPlatform, isRunningStandalone, type InstallPlatform } from "@/lib/install-platform";

/**
 * Centralise la décision "y a-t-il quelque chose à proposer à ce visiteur ?"
 * pour que le bouton d'installation ET les blocs qui l'entourent (carte
 * "Mon Profil", titres, descriptions...) apparaissent et disparaissent
 * ensemble — jamais un texte affiché à côté d'un bouton absent.
 */
export function useInstallAvailability() {
  const { canInstall, isStandalone, promptInstall } = usePwaInstall();
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [standaloneOnMount, setStandaloneOnMount] = useState(false);

  useEffect(() => {
    setPlatform(detectInstallPlatform());
    setStandaloneOnMount(isRunningStandalone());
  }, []);

  const alreadyInstalled = isStandalone || standaloneOnMount;
  // "ios" volontairement exclu pour l'instant : pas encore d'application
  // disponible sur cette plateforme (seul Android l'est, via le Play Store) —
  // à réintégrer dans cette condition le jour où ça change, le reste du
  // flux (bouton, modale d'instructions) est déjà prêt et inchangé.
  const available = !alreadyInstalled && (platform === "android" || platform === "mac-safari" || canInstall);

  return { available, platform, canInstall, promptInstall };
}
