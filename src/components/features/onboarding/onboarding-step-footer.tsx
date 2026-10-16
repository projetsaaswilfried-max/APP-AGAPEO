"use client";

import { Button } from "@/components/ui/button";

interface OnboardingStepFooterProps {
  onSaveAndNext: () => void;
  /** Absent = étape obligatoire, aucun moyen de la différer. */
  onSkip?: () => void;
  /** Absent sur la toute première étape accessible (rien vers quoi revenir). */
  onBack?: () => void;
  isSaving?: boolean;
  isSkipping?: boolean;
  /** Vrai tant que les champs obligatoires de l'étape ne sont pas remplis. */
  isNextDisabled?: boolean;
  saveLabel?: string;
  skipLabel?: string;
}

/** Jusqu'à trois actions par étape, cohérentes sur tout l'onboarding : revenir en arrière, différer cette section (si autorisé), ou l'enregistrer et avancer. */
export function OnboardingStepFooter({
  onSaveAndNext,
  onSkip,
  onBack,
  isSaving = false,
  isSkipping = false,
  isNextDisabled = false,
  saveLabel = "Enregistrer et suivant",
  skipLabel = "Plus tard"
}: OnboardingStepFooterProps) {
  return (
    <div className="sticky bottom-0 bg-card pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] -mx-5 px-5 border-t border-border/40 md:static md:bg-transparent md:pt-2 md:pb-0 md:-mx-0 md:px-0 md:border-0 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
      <div className="flex items-center gap-2">
        {/* Masqué sur mobile : la flèche de retour en haut de l'écran (format
            app native) couvre déjà ce rôle là-bas — desktop n'a pas cette
            flèche, "Retour" y reste donc le seul moyen de revenir en arrière. */}
        {onBack && (
          <Button variant="outline" size="lg" onClick={onBack} disabled={isSaving || isSkipping} className="hidden md:inline-flex">
            Retour
          </Button>
        )}
        {onSkip && (
          <Button variant="ghost" size="lg" onClick={onSkip} isLoading={isSkipping} disabled={isSaving} className="flex-1 sm:flex-none">
            {skipLabel}
          </Button>
        )}
      </div>
      <Button
        variant="primary"
        size="lg"
        onClick={onSaveAndNext}
        isLoading={isSaving}
        disabled={isSkipping || isNextDisabled}
        className="w-full sm:w-auto"
      >
        {saveLabel}
      </Button>
    </div>
  );
}
