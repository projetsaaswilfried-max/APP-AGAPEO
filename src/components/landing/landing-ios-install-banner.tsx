"use client";

import { Share, X, SquarePlus } from "lucide-react";
import { useIosInstallPrompt } from "@/core/hooks/use-ios-install-prompt";

/**
 * Bandeau flottant en bas de l'écran plutôt qu'en haut : la landing a une
 * navbar fixed avec une marge de hero codée en dur (voir landing-hero.tsx),
 * donc tout ajout dans le flux normal en haut désynchroniserait cette marge.
 * En position fixed bottom, ce bandeau flotte au-dessus du contenu sans
 * déplacer ni la navbar ni le hero.
 */
export function LandingIosInstallBanner() {
  const { shouldShow, dismiss } = useIosInstallPrompt();
  if (!shouldShow) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-6 select-none"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-md flex items-start gap-3 rounded-3xl bg-white/95 backdrop-blur-xl border border-zinc-100 px-5 py-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#E83E75] text-white shrink-0">
          <SquarePlus size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900">Installe AGAPEO sur ton iPhone</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Appuie sur <Share size={12} className="inline -mt-0.5 mx-0.5" aria-label="Partager" />{" "}
            <strong>Partager</strong> en bas de Safari, puis <strong>&laquo; Sur l&apos;écran d&apos;accueil &raquo;</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-full hover:bg-zinc-100 shrink-0"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
