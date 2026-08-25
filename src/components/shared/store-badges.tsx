"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { SITE_CONFIG } from "@/config/site";
import { cn } from "@/lib/utils";
import { detectInstallPlatform, type InstallPlatform } from "@/lib/install-platform";
import { InstallInstructionsModal } from "./install-instructions-modal";

const BADGE_CLASS =
  "inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors";

interface BadgeProps {
  className?: string;
}

/**
 * Toujours visible, quel que soit l'appareil du visiteur (comme les vrais
 * badges "Télécharger sur l'App Store" / "Disponible sur Google Play" des
 * autres sites) — pas seulement quand on détecte un iPhone/Mac, pour rester
 * cohérent avec la convention du logo Apple annoncée à côté du bouton Android.
 */
export function AppleStoreBadge({ className }: BadgeProps) {
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setPlatform(detectInstallPlatform());
  }, []);

  const variant = platform === "mac-safari" ? "mac-safari" : "ios";

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={cn(BADGE_CLASS, className)}>
        <Icon icon="mdi:apple" width={26} height={26} className="shrink-0" />
        <span className="flex flex-col items-start leading-none text-left">
          <span className="text-[10px] uppercase tracking-wide text-white/70">Installer sur</span>
          <span className="text-sm font-semibold">iPhone &amp; Mac</span>
        </span>
      </button>
      <InstallInstructionsModal variant={variant} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export function GooglePlayBadge({ className }: BadgeProps) {
  return (
    <a href={SITE_CONFIG.apps.playStoreUrl} target="_blank" rel="noopener noreferrer" className={cn(BADGE_CLASS, className)}>
      <Icon icon="mdi:google-play" width={26} height={26} className="shrink-0" />
      <span className="flex flex-col items-start leading-none text-left">
        <span className="text-[10px] uppercase tracking-wide text-white/70">Disponible sur</span>
        <span className="text-sm font-semibold">Google Play</span>
      </span>
    </a>
  );
}
