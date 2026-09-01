"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingProgress } from "./onboarding-progress";
import { OnboardingEssentialInfoStep } from "./onboarding-essential-info-step";
import { OnboardingPhotosStep } from "./onboarding-photos-step";
import { OnboardingSelfieStep } from "./onboarding-selfie-step";
import { OnboardingFaithStep } from "./onboarding-faith-step";
import { OnboardingPreferencesStep } from "./onboarding-preferences-step";
import { saveOnboardingStepAction } from "@/lib/actions/profile.actions";
import { logOnboardingEventAction } from "@/lib/actions/onboarding-events.actions";
import { trackMetaEventOnce } from "@/lib/meta-pixel";
import { X } from "lucide-react";
import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";

interface OnboardingWizardProps {
  profile: ProfileRow;
  initialPhotos: ProfilePhotoRow[];
}

// Ordre canonique persistant (`profiles.onboarding_step`, 0-2) — "essential"
// et "selfie" sont des étapes conditionnelles insérées autour de celui-ci
// selon le profil, jamais leur propre valeur persistée dédiée.
const BASE_STEP_KEYS = ["photos", "faith", "preferences"] as const;

type StepKey = "essential" | "photos" | "selfie" | "faith" | "preferences";

export function OnboardingWizard({ profile, initialPhotos }: OnboardingWizardProps) {
  // Uniquement vrai tant que genre/date de naissance/pays manquent — que le
  // compte vienne de Google (jamais transmis) ou d'une inscription email
  // classique (désormais collectés ici, pas à l'inscription, pour alléger le
  // tout premier écran).
  const needsEssentialInfo = !profile.gender || !profile.birth_date || !profile.country;
  // Un profil déjà VERIFIED (ou dont la demande est déjà PENDING) qui revient
  // ici pour ajuster une section n'a plus besoin de refaire un selfie.
  // L'équipe (staff) n'a plus jamais besoin de se faire vérifier — son profil
  // ne sera de toute façon jamais montré sur la plateforme.
  const needsVerificationSubmission =
    !profile.is_staff && (profile.photo_verification_status === "UNVERIFIED" || profile.photo_verification_status === "REJECTED");

  const stepKeys: StepKey[] = [
    ...(needsEssentialInfo ? (["essential"] as StepKey[]) : []),
    "photos",
    ...(needsVerificationSubmission ? (["selfie"] as StepKey[]) : []),
    "faith",
    "preferences"
  ];
  const stepLabels = [
    ...(needsEssentialInfo ? ["Tes informations"] : []),
    "Photos",
    ...(needsVerificationSubmission ? ["Selfie"] : []),
    "Ma foi",
    "Ce que je recherche"
  ];

  // Un profil refusé (ou jamais soumis malgré un onboarding marqué "terminé",
  // via "Terminer sans soumettre"), ou à qui il manque encore genre/date de
  // naissance/pays (un vrai bug déjà corrigé permettait auparavant d'être
  // VERIFIED sans jamais les avoir renseignés — ces comptes restent
  // invisibles dans Découvrir, qui filtre sur `gender`, tant que ce n'est
  // pas comblé), doit reprendre le parcours exactement comme s'il n'avait
  // jamais validé son profil — navigation libre entre étapes réservée à un
  // membre VRAIMENT déjà en règle qui ne fait qu'ajuster une section.
  const isRevisit = profile.onboarding_completed && !needsVerificationSubmission && !needsEssentialInfo;

  // Résout la position de départ à partir de l'étape "de base" (0-2) déjà
  // persistée, en tenant compte des étapes conditionnelles réellement
  // présentes pour CE profil — robuste à n'importe quelle combinaison
  // d'étapes optionnelles, contrairement à un simple décalage d'index. Un
  // profil qui doit reprendre le processus (cf. `isRevisit` ci-dessus)
  // repart systématiquement de la première étape, même si `onboarding_step`
  // pointait encore vers la fin de sa précédente tentative.
  const [stepIndex, setStepIndex] = useState(() => {
    if (!isRevisit) return 0;
    const savedBaseKey = BASE_STEP_KEYS[Math.min(profile.onboarding_step, 2)];
    const resolved = stepKeys.indexOf(savedBaseKey);
    return resolved >= 0 ? resolved : 0;
  });

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
    // `onboarding_step` en base ne connaît que les 3 étapes de base (0-2) —
    // les étapes conditionnelles ("essential", "selfie") retombent sur la
    // plus proche étape de base non encore atteinte.
    const nextKey = stepKeys[next];
    const baseIndex = (BASE_STEP_KEYS as readonly StepKey[]).indexOf(nextKey);
    void saveOnboardingStepAction(baseIndex >= 0 ? baseIndex : 0);
  };

  const currentKey = stepKeys[stepIndex];

  // Entonnoir d'onboarding (espace admin) : uniquement pour un vrai nouveau
  // compte, jamais pour un membre déjà onboardé qui revient corriger une section.
  useEffect(() => {
    if (!isRevisit) {
      void logOnboardingEventAction("STEP_VIEWED", currentKey);
    }
  }, [currentKey, isRevisit]);

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
            : `Bienvenue ${profile.first_name} — ça prend environ 5 minutes. Chaque étape est obligatoire pour passer à la suivante, mais tu peux revenir plus tard si besoin.`}
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
          {currentKey === "essential" && <OnboardingEssentialInfoStep onNext={() => goTo(stepIndex + 1)} />}
          {currentKey === "photos" && (
            <OnboardingPhotosStep
              userId={profile.id}
              initialPhotos={initialPhotos}
              photoVerificationStatus={profile.photo_verification_status}
              photoLimit={profile.is_premium ? 10 : 2}
              announceSelfieStep={needsVerificationSubmission}
              onNext={() => goTo(stepIndex + 1)}
            />
          )}
          {currentKey === "selfie" && (
            <OnboardingSelfieStep
              userId={profile.id}
              hasPendingSelfie={Boolean(profile.pending_selfie_storage_path)}
              onNext={() => goTo(stepIndex + 1)}
              onBack={() => goTo(stepIndex - 1)}
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
