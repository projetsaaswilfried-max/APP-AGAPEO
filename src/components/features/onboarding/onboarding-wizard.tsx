"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingProgress } from "./onboarding-progress";
import { OnboardingEssentialInfoStep } from "./onboarding-essential-info-step";
import { OnboardingPhotosStep } from "./onboarding-photos-step";
import { OnboardingFaithStep } from "./onboarding-faith-step";
import { OnboardingPersonalityStep } from "./onboarding-personality-step";
import { OnboardingMarriageVisionStep } from "./onboarding-marriage-vision-step";
import { OnboardingPreferencesStep } from "./onboarding-preferences-step";
import { saveOnboardingStepAction } from "@/lib/actions/profile.actions";
import { X } from "lucide-react";
import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";

interface OnboardingWizardProps {
  profile: ProfileRow;
  initialPhotos: ProfilePhotoRow[];
}

const BASE_STEP_KEYS = ["photos", "faith", "personality", "marriage", "preferences"] as const;
const BASE_STEP_LABELS = ["Photos", "Ma foi", "Personnalité", "Vision du mariage", "Ce que je recherche"];

export function OnboardingWizard({ profile, initialPhotos }: OnboardingWizardProps) {
  // Uniquement vrai pour un compte créé via Google (OAuth) : le fournisseur
  // ne transmet jamais genre/date de naissance, rarement le pays.
  const needsEssentialInfo = !profile.gender || !profile.birth_date || !profile.country;
  const stepKeys = needsEssentialInfo ? (["essential", ...BASE_STEP_KEYS] as const) : BASE_STEP_KEYS;
  const stepLabels = needsEssentialInfo ? ["Tes informations", ...BASE_STEP_LABELS] : BASE_STEP_LABELS;

  const [stepIndex, setStepIndex] = useState(() => (needsEssentialInfo ? 0 : Math.min(profile.onboarding_step, 4)));
  const isRevisit = profile.onboarding_completed;

  const goTo = (next: number) => {
    setStepIndex(next);
    // `onboarding_step` en base ne connaît que les 5 étapes historiques (0-4) —
    // l'étape "essential" (uniquement pour Google) ne décale pas cette numérotation.
    const persistedStep = needsEssentialInfo ? Math.max(next - 1, 0) : next;
    void saveOnboardingStepAction(persistedStep);
  };

  const currentKey = stepKeys[stepIndex];

  return (
    <div className="space-y-6">
      {isRevisit && (
        <div className="flex justify-end">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X size={14} /> Fermer
          </Link>
        </div>
      )}

      <div className="text-center select-none space-y-1">
        <h1 className="font-display font-bold text-xl tracking-tight text-foreground">
          {isRevisit ? "Complète ton profil" : "Bienvenue sur Agapeo"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRevisit
            ? "Reviens sur n'importe quelle étape ci-dessous pour compléter ou corriger une section."
            : `Bienvenue ${profile.first_name} — quelques étapes avant de découvrir la communauté. Chaque section peut être renseignée maintenant ou plus tard.`}
        </p>
      </div>

      <OnboardingProgress currentStep={stepIndex} labels={stepLabels} onStepClick={goTo} />

      <Card variant="base">
        <CardContent className="p-6">
          {currentKey === "essential" && <OnboardingEssentialInfoStep onNext={() => goTo(1)} />}
          {currentKey === "photos" && (
            <OnboardingPhotosStep
              userId={profile.id}
              initialPhotos={initialPhotos}
              photoVerificationStatus={profile.photo_verification_status}
              onNext={() => goTo(stepIndex + 1)}
            />
          )}
          {currentKey === "faith" && <OnboardingFaithStep profile={profile} onNext={() => goTo(stepIndex + 1)} />}
          {currentKey === "personality" && <OnboardingPersonalityStep profile={profile} onNext={() => goTo(stepIndex + 1)} />}
          {currentKey === "marriage" && <OnboardingMarriageVisionStep profile={profile} onNext={() => goTo(stepIndex + 1)} />}
          {currentKey === "preferences" && <OnboardingPreferencesStep profile={profile} />}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Ton profil ne sera visible par les autres membres qu&apos;une fois les informations essentielles renseignées
        (photo, foi, vision du mariage).
      </p>
    </div>
  );
}
