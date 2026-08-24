"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingProgress } from "./onboarding-progress";
import { OnboardingEssentialInfoStep } from "./onboarding-essential-info-step";
import { OnboardingPhotosStep } from "./onboarding-photos-step";
import { OnboardingFaithStep } from "./onboarding-faith-step";
import { OnboardingPreferencesStep } from "./onboarding-preferences-step";
import { saveOnboardingStepAction } from "@/lib/actions/profile.actions";
import { trackMetaEventOnce } from "@/lib/meta-pixel";
import { X } from "lucide-react";
import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";

interface OnboardingWizardProps {
  profile: ProfileRow;
  initialPhotos: ProfilePhotoRow[];
}

const BASE_STEP_KEYS = ["photos", "faith", "preferences"] as const;
const BASE_STEP_LABELS = ["Photos", "Ma foi", "Ce que je recherche"];

export function OnboardingWizard({ profile, initialPhotos }: OnboardingWizardProps) {
  // Uniquement vrai pour un compte créé via Google (OAuth) : le fournisseur
  // ne transmet jamais genre/date de naissance, rarement le pays.
  const needsEssentialInfo = !profile.gender || !profile.birth_date || !profile.country;
  const stepKeys = needsEssentialInfo ? (["essential", ...BASE_STEP_KEYS] as const) : BASE_STEP_KEYS;
  const stepLabels = needsEssentialInfo ? ["Tes informations", ...BASE_STEP_LABELS] : BASE_STEP_LABELS;

  const [stepIndex, setStepIndex] = useState(() => (needsEssentialInfo ? 0 : Math.min(profile.onboarding_step, 2)));
  const isRevisit = profile.onboarding_completed;

  // Arrivée sur l'onboarding = confirmation que le compte vient d'être créé
  // (email confirmé, ou OAuth Google) : c'est ici que la personne devient un
  // "prospect" traqué par le Pixel Meta. `isRevisit` distingue un vrai
  // nouveau compte d'un membre déjà onboardé revenant corriger son profil.
  useEffect(() => {
    if (!isRevisit) {
      trackMetaEventOnce("CompleteRegistration", profile.id);
    }
  }, [isRevisit, profile.id]);

  const goTo = (next: number) => {
    setStepIndex(next);
    // `onboarding_step` en base ne connaît que les 3 étapes (0-2) — l'étape
    // "essential" (uniquement pour Google) ne décale pas cette numérotation.
    const persistedStep = needsEssentialInfo ? Math.max(next - 1, 0) : next;
    void saveOnboardingStepAction(persistedStep);
  };

  const currentKey = stepKeys[stepIndex];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href={isRevisit ? "/profile" : "/feed"}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <X size={14} /> {isRevisit ? "Fermer" : "Revenir plus tard"}
        </Link>
      </div>

      <div className="text-center select-none space-y-1">
        <h1 className="font-display font-bold text-xl tracking-tight text-foreground">
          {isRevisit ? "Complète ton profil" : "Bienvenue sur Agapeo"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRevisit
            ? "Reviens sur n'importe quelle étape ci-dessous pour compléter ou corriger une section."
            : `Bienvenue ${profile.first_name} — chaque étape est obligatoire pour passer à la suivante, mais tu peux revenir plus tard si besoin.`}
        </p>
      </div>

      <OnboardingProgress
        currentStep={stepIndex}
        labels={stepLabels}
        // Un membre déjà onboardé peut sauter librement entre les étapes pour
        // corriger n'importe quelle section ; un nouveau compte doit les
        // remplir dans l'ordre — cliquer devant l'étape courante ne fait
        // donc rien tant qu'elle n'a pas été atteinte via "Continuer".
        onStepClick={(index) => {
          if (isRevisit || index <= stepIndex) goTo(index);
        }}
      />

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
          {currentKey === "faith" && (
            <OnboardingFaithStep profile={profile} onNext={() => goTo(stepIndex + 1)} onBack={() => goTo(stepIndex - 1)} />
          )}
          {currentKey === "preferences" && <OnboardingPreferencesStep profile={profile} onBack={() => goTo(stepIndex - 1)} />}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Si tu quittes avant la fin, ton profil reste incomplet et invisible pour les autres membres — reviens à tout
        moment depuis Accueil pour reprendre où tu t&apos;étais arrêté(e).
      </p>
    </div>
  );
}
