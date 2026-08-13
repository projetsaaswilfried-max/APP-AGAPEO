"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { updateProfileAction, completeOnboardingAction } from "@/lib/actions/profile.actions";
import { submitVerificationRequestAction } from "@/lib/actions/verification.actions";
import { AlertCircle, ArrowRight } from "lucide-react";
import type { ProfileRow } from "@/lib/supabase/database.types";

interface OnboardingPreferencesStepProps {
  profile: ProfileRow;
}

export function OnboardingPreferencesStep({ profile }: OnboardingPreferencesStepProps) {
  const [ageMin, setAgeMin] = useState(profile.desired_age_min);
  const [ageMax, setAgeMax] = useState(profile.desired_age_max);
  const [desiredCountries, setDesiredCountries] = useState(profile.desired_countries);
  const [desiredValues, setDesiredValues] = useState(profile.desired_values);
  const [isPending, startTransition] = useTransition();
  const [isSkipping, startSkipTransition] = useTransition();
  const [isFinishing, startFinishTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const savePreferences = () =>
    updateProfileAction({
      desired_age_min: ageMin,
      desired_age_max: ageMax,
      desired_countries: desiredCountries,
      desired_values: desiredValues
    });

  /** Bouton principal : enregistre, soumet pour vérification, puis termine l'onboarding (redirige). */
  const handleSubmit = () => {
    setSubmitError(null);
    startTransition(async () => {
      await savePreferences();
      const result = await submitVerificationRequestAction();
      if (result?.error) {
        setSubmitError(result.error);
        return;
      }
      await completeOnboardingAction();
    });
  };

  /** Utilisé uniquement quand la soumission a échoué (profil encore incomplet) : termine sans soumettre pour vérification. */
  const handleFinishWithoutSubmitting = () => {
    startFinishTransition(async () => {
      await completeOnboardingAction();
    });
  };

  const handleSkip = () => startSkipTransition(async () => completeOnboardingAction());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Ce que tu recherches</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ces critères alimentent tes recommandations dans Découvrir — tu pourras les affiner à tout moment.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          type="number"
          label="Âge minimum"
          min={18}
          max={99}
          value={ageMin}
          onChange={(e) => setAgeMin(Number(e.target.value))}
        />
        <Input
          type="number"
          label="Âge maximum"
          min={18}
          max={99}
          value={ageMax}
          onChange={(e) => setAgeMax(Number(e.target.value))}
        />
      </div>

      <TagInput
        label="Pays acceptés"
        placeholder="Ex : France, Canada..."
        value={desiredCountries}
        onChange={setDesiredCountries}
        maxTags={8}
      />

      <TagInput
        label="Valeurs importantes chez l'autre"
        placeholder="Ex : Foi, Bienveillance..."
        value={desiredValues}
        onChange={setDesiredValues}
        maxTags={12}
      />

      {submitError && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 space-y-2">
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle size={14} className="shrink-0" />
            {submitError}
          </div>
          <button
            type="button"
            onClick={handleFinishWithoutSubmitting}
            disabled={isFinishing}
            className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            Terminer sans soumettre pour l&apos;instant <ArrowRight size={12} />
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        En soumettant, ton profil est envoyé à notre équipe pour vérification — tu recevras un email de confirmation.
        Retrouve aussi ce bouton à tout moment depuis{" "}
        <Link href="/profile" className="text-accent underline underline-offset-2">
          Mon Compte & Sécurité
        </Link>
        .
      </p>

      <OnboardingStepFooter
        onSkip={handleSkip}
        onSaveAndNext={handleSubmit}
        isSaving={isPending || isFinishing}
        isSkipping={isSkipping}
        skipLabel="Terminer plus tard"
        saveLabel="Soumettre"
      />
    </div>
  );
}
