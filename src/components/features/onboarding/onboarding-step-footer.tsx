"use client";

import { Button } from "@/components/ui/button";

interface OnboardingStepFooterProps {
  onSkip: () => void;
  onSaveAndNext: () => void;
  isSaving?: boolean;
  isSkipping?: boolean;
  saveLabel?: string;
  skipLabel?: string;
}

/** Deux actions par étape, cohérentes sur tout l'onboarding : différer cette section, ou l'enregistrer et avancer. */
export function OnboardingStepFooter({
  onSkip,
  onSaveAndNext,
  isSaving = false,
  isSkipping = false,
  saveLabel = "Enregistrer et suivant",
  skipLabel = "Plus tard"
}: OnboardingStepFooterProps) {
  return (
    <div className="flex justify-between items-center pt-2 gap-3">
      <Button variant="ghost" size="lg" onClick={onSkip} isLoading={isSkipping} disabled={isSaving}>
        {skipLabel}
      </Button>
      <Button variant="primary" size="lg" onClick={onSaveAndNext} isLoading={isSaving} disabled={isSkipping}>
        {saveLabel}
      </Button>
    </div>
  );
}
