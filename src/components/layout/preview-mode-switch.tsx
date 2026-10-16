"use client";

import { useOptimistic, useTransition } from "react";
import { motion } from "framer-motion";
import { useSession } from "@/core/providers/session-provider";
import { setPreviewModeAction } from "@/lib/actions/preview.actions";
import { canUsePreviewMode, type PreviewMode } from "@/domain/preview-mode";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ mode: PreviewMode | null; label: string; title: string }> = [
  { mode: null, label: "Équipe", title: "Ta vue réelle, avec les droits de l'équipe" },
  { mode: "subscriber", label: "Abonné", title: "Voir l'interface comme un membre abonné" },
  { mode: "free", label: "Non abonné", title: "Voir l'interface comme un membre non abonné" }
];

/** Commutateur d'aperçu (équipe uniquement) : bascule l'interface membre entre la vue équipe, abonné et non abonné. */
export function PreviewModeSwitch({ className, layoutId = "preview-mode-pill" }: { className?: string; layoutId?: string }) {
  const { realProfile, previewMode } = useSession();
  const [isPending, startTransition] = useTransition();
  // Réaction immédiate au clic, le temps que le serveur re-rende la page avec le nouveau cookie.
  const [optimisticMode, setOptimisticMode] = useOptimistic(previewMode);

  if (!canUsePreviewMode(realProfile)) return null;

  const select = (mode: PreviewMode | null) => {
    if (mode === optimisticMode) return;
    startTransition(async () => {
      setOptimisticMode(mode);
      await setPreviewModeAction(mode);
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Aperçu de l'interface"
      aria-busy={isPending}
      className={cn("flex items-center gap-0.5 p-1 bg-secondary rounded-full select-none", className)}
    >
      {OPTIONS.map((option) => {
        const isActive = option.mode === optimisticMode;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={option.title}
            onClick={() => select(option.mode)}
            className={cn(
              "relative px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              isActive
                ? option.mode
                  ? "text-primary-foreground"
                  : "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className={cn("absolute inset-0 rounded-full shadow-2xs", option.mode ? "bg-primary" : "bg-card")}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
