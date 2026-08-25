"use client";

import type { ReactNode } from "react";
import { Share, SquarePlus, MousePointerClick, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface InstallInstructionsModalProps {
  variant: "ios" | "mac-safari";
  isOpen: boolean;
  onClose: () => void;
}

interface Step {
  icon: LucideIcon;
  text: ReactNode;
}

const STEPS: Record<"ios" | "mac-safari", Step[]> = {
  ios: [
    {
      icon: Share,
      text: (
        <>
          Appuie sur l&apos;icône <strong>Partager</strong> de ton navigateur (Safari, Chrome, ou autre).
        </>
      )
    },
    {
      icon: SquarePlus,
      text: (
        <>
          Choisis <strong>« Sur l&apos;écran d&apos;accueil »</strong> dans la liste (fais défiler si besoin).
        </>
      )
    },
    {
      icon: MousePointerClick,
      text: (
        <>
          Confirme en appuyant sur <strong>« Ajouter »</strong>.
        </>
      )
    }
  ],
  "mac-safari": [
    {
      icon: Share,
      text: (
        <>
          Clique sur l&apos;icône <strong>Partager</strong> dans la barre d&apos;adresse de Safari.
        </>
      )
    },
    {
      icon: SquarePlus,
      text: (
        <>
          Choisis <strong>« Ajouter au Dock »</strong>.
        </>
      )
    },
    {
      icon: MousePointerClick,
      text: (
        <>
          Clique sur <strong>« Ajouter »</strong> pour confirmer.
        </>
      )
    }
  ]
};

/**
 * Aucune API ne permet de déclencher l'installation par code sur Safari
 * (iOS ou Mac) — Apple impose ce geste manuel. Ce popup remplace le
 * bandeau texte par un guide illustré étape par étape, déclenché
 * volontairement par un clic sur "Installer" plutôt qu'affiché à tout le
 * monde en permanence.
 */
export function InstallInstructionsModal({ variant, isOpen, onClose }: InstallInstructionsModalProps) {
  const steps = STEPS[variant];
  const title = variant === "ios" ? "Installer sur iPhone / iPad" : "Installer sur Mac";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col gap-5">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <div key={index} className="flex items-center gap-3.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-subtle text-primary shrink-0 text-sm font-semibold">
                {index + 1}
              </div>
              <StepIcon size={18} className="text-primary shrink-0" />
              <p className="text-sm text-foreground leading-relaxed">{step.text}</p>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground pt-3 border-t border-border/40">
          Cette étape est demandée par Apple lui-même — aucune application externe n&apos;est nécessaire, Agapeo s&apos;installe
          directement depuis le site.
        </p>
      </div>
    </Modal>
  );
}
