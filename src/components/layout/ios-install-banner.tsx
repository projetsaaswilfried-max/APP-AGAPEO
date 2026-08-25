"use client";

import { Share, X, SquarePlus } from "lucide-react";
import { useIosInstallPrompt } from "@/core/hooks/use-ios-install-prompt";

export function IosInstallBanner() {
  const { shouldShow, dismiss } = useIosInstallPrompt();
  if (!shouldShow) return null;

  return (
    <div className="px-5 pt-4 select-none">
      <div className="flex items-start gap-3 rounded-3xl bg-accent-subtle/80 border border-accent/20 px-5 py-3.5 shadow-soft">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shrink-0 shadow-accent-glow">
          <SquarePlus size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Installe Agapeo sur ton iPhone</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Appuie sur <Share size={12} className="inline -mt-0.5 mx-0.5" aria-label="Partager" />{" "}
            <strong>Partager</strong> en bas de Safari, puis <strong>&laquo; Sur l&apos;écran d&apos;accueil &raquo;</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary shrink-0"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
