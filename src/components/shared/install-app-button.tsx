"use client";

import { useState } from "react";
import { Download, Play } from "lucide-react";
import { Icon } from "@iconify/react";
import { useInstallAvailability } from "@/core/hooks/use-install-availability";
import { InstallInstructionsModal } from "./install-instructions-modal";
import { SITE_CONFIG } from "@/config/site";

interface InstallAppButtonProps {
  className: string;
  iconOnly?: boolean;
  onClick?: () => void;
}

/**
 * Bouton unique qui s'adapte à l'appareil du visiteur — utilisé là où
 * l'action concerne "MON appareil à moi" (ex : Mon Profil). Pour la landing
 * publique, où on veut montrer les deux options en même temps à n'importe
 * quel visiteur, voir plutôt store-badges.tsx.
 * - Android → fiche Google Play (l'appli TWA réelle, jamais une PWA en
 *   doublon — cf. `prefer_related_applications` dans manifest.ts).
 * - Windows / Mac via Chrome ou Edge → vraie installation en un clic
 *   (popup native Oui/Non du navigateur, via `beforeinstallprompt`).
 * - iPhone/iPad ou Mac + Safari → guide illustré (Apple n'expose aucune API
 *   pour installer par code, quel que soit le navigateur utilisé).
 * - Autre navigateur non supporté, ou appli déjà installée → rien.
 */
export function InstallAppButton({ className, iconOnly = false, onClick }: InstallAppButtonProps) {
  const { available, platform, canInstall, promptInstall } = useInstallAvailability();
  const [modalOpen, setModalOpen] = useState(false);

  if (!available) return null;

  if (platform === "android") {
    return (
      <a
        href={SITE_CONFIG.apps.playStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        <Play size={16} className="shrink-0 fill-current" />
        {!iconOnly && "Disponible sur Google Play"}
      </a>
    );
  }

  if (platform === "ios" || platform === "mac-safari") {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            onClick?.();
            setModalOpen(true);
          }}
          className={className}
        >
          <Icon icon="mdi:apple" width={16} height={16} className="shrink-0" />
          {!iconOnly && (platform === "ios" ? "Installer sur iPhone / iPad" : "Installer sur Mac")}
        </button>
        <InstallInstructionsModal variant={platform} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  // Seul cas restant possible ici : `canInstall` (Windows/Mac via Chrome ou Edge).
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        if (canInstall) promptInstall();
      }}
      className={className}
    >
      <Download size={16} className="shrink-0" />
      {!iconOnly && "Installer l'application"}
    </button>
  );
}
