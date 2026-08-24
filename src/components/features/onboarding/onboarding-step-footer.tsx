"use client";

import { Button } from "@/components/ui/button";

interface OnboardingStepFooterProps {
  onSkip: () => void;
  onSaveAndNext: () => void;
  /** Absent sur la toute première étape accessible (rien vers quoi revenir). */
  onBack?: () => void;
  isSaving?: boolean;
  isSkipping?: boolean;
  saveLabel?: string;
  skipLabel?: string;
}

/** Jusqu'à trois actions par étape, cohérentes sur tout l'onboarding : revenir en arrière, différer cette section, ou l'enregistrer et avancer. */
export function OnboardingStepFooter({
  onSkip,
  onSaveAndNext,
  onBack,
  isSaving = false,
  isSkipping = false,
  saveLabel = "Enregistrer et suivant",
  skipLabel = "Plus tard"
}: OnboardingStepFooterProps) {
  return (
    <div className="flex justify-between items-center pt-2 gap-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <Button variant="outline" size="lg" onClick={onBack} disabled={isSaving || isSkipping}>
            Retour
          </Button>
        )}
        <Button variant="ghost" size="lg" onClick={onSkip} isLoading={isSkipping} disabled={isSaving}>
          {skipLabel}
        </Button>
      </div>
      <Button variant="primary" size="lg" onClick={onSaveAndNext} isLoading={isSaving} disabled={isSkipping}>
        {saveLabel}
      </Button>
    </div>
  );
}
