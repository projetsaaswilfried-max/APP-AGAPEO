"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingProgress } from "./onboarding-progress";
import { OnboardingEssentialInfoStep } from "./onboarding-essential-info-step";
import { OnboardingPhotosStep } from "./onboarding-photos-step";
import { OnboardingSelfieStep } from "./onboarding-selfie-step";
import { OnboardingFaithStep } from "./onboarding-faith-step";
import { OnboardingHobbiesStep } from "./onboarding-hobbies-step";
import { OnboardingRecapStep } from "./onboarding-recap-step";
import { saveOnboardingStepAction } from "@/lib/actions/profile.actions";
import { logOnboardingEventAction } from "@/lib/actions/onboarding-events.actions";
import { trackMetaEventOnce } from "@/lib/meta-pixel";
import { needsVerificationSubmission as computeNeedsVerificationSubmission, type OnboardingStepKey } from "@/domain/profile-completeness";
import { ArrowLeft, X } from "lucide-react";
import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";

interface OnboardingWizardProps {
  profile: ProfileRow;
  initialPhotos: ProfilePhotoRow[];
}

// Ordre canonique persistant (`profiles.onboarding_step`, 0-2) — "essential"
// et "selfie" sont des étapes conditionnelles insérées autour de celui-ci
// selon le profil, jamais leur propre valeur persistée dédiée. "recap" n'a
// pas besoin d'y figurer : elle est toujours la dernière étape, jamais une
// position de reprise (on ne "reprend" jamais sur un simple écran de relecture).
const BASE_STEP_KEYS = ["photos", "faith", "hobbies"] as const;

type StepKey = OnboardingStepKey;

/** Titre + sous-titre par étape (format app native : affichés dans le bandeau sombre au-dessus de la feuille, sur mobile uniquement — desktop garde son propre titre à l'intérieur de la carte). */
const STEP_CONTENT: Record<StepKey, { title: string; subtitle: string }> = {
  essential: { title: "Parle-nous de toi", subtitle: "Genre, âge et pays : verrouillés après validation." },
  photos: { title: "Ta photo", subtitle: "Ajoute ta photo de profil." },
  selfie: { title: "Vérifie ton identité", subtitle: "Un selfie pour confirmer que c'est bien toi." },
  faith: { title: "Ta foi", subtitle: "Confession, situation et pourquoi tu cherches le mariage." },
  hobbies: { title: "Tes passions", subtitle: "Tes centres d'intérêt, ta présentation et ta taille." },
  recap: { title: "Récapitulatif", subtitle: "Vérifie avant de valider ton profil." }
};

export function OnboardingWizard({ profile, initialPhotos }: OnboardingWizardProps) {
  const router = useRouter();
  // Figés à la première valeur lue (jamais recalculés, même après le
  // `router.refresh()` de `goTo` ci-dessous) : `stepKeys` en dépend
  // directement, et les étapes "essential"/"selfie" apparaissant ou
  // disparaissant du tableau EN COURS DE SESSION décalerait tous les index
  // suivants sous les pieds de la personne (ex: valider "essential" puis
  // voir la suite sauter directement à "Ma foi" dès que le profil rafraîchi
  // repasse `needsEssentialInfo` à faux). Le `profile` transmis aux étapes
  // elles-mêmes reste lui bien le plus frais possible — seule la COMPOSITION
  // du parcours est figée, pas les valeurs affichées à l'intérieur.
  const [{ needsEssentialInfo, needsVerificationSubmission }] = useState(() => ({
    // Uniquement vrai tant que genre/date de naissance/pays manquent — que le
    // compte vienne de Google (jamais transmis) ou d'une inscription email
    // classique (désormais collectés ici, pas à l'inscription, pour alléger le
    // tout premier écran).
    needsEssentialInfo: !profile.gender || !profile.birth_date || !profile.country,
    // Un profil déjà VERIFIED (ou dont la demande est déjà PENDING) qui revient
    // ici pour ajuster une section n'a plus besoin de refaire un selfie.
    // L'équipe (staff) n'a plus jamais besoin de se faire vérifier — son profil
    // ne sera de toute façon jamais montré sur la plateforme. Même prédicat
    // que la bannière du dashboard (cf. incomplete-profile-banner.tsx).
    needsVerificationSubmission: !profile.is_staff && computeNeedsVerificationSubmission(profile)
  }));

  const stepKeys: StepKey[] = [
    ...(needsEssentialInfo ? (["essential"] as StepKey[]) : []),
    "photos",
    ...(needsVerificationSubmission ? (["selfie"] as StepKey[]) : []),
    "faith",
    "hobbies",
    "recap"
  ];
  const stepLabels = [
    ...(needsEssentialInfo ? ["Tes informations"] : []),
    "Photos",
    ...(needsVerificationSubmission ? ["Selfie"] : []),
    "Ma foi",
    "Tes passions",
    "Récapitulatif"
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
    // Chaque étape sauvegarde elle-même ses champs côté serveur avant
    // d'appeler `goTo` — mais `profile`/`initialPhotos` ici ne sont que les
    // valeurs lues au tout premier chargement de la page, jamais rafraîchies
    // depuis. Sans ce `refresh()`, le Récapitulatif (et toute étape qui lirait
    // un champ rempli plus tôt dans CETTE même visite) afficherait encore les
    // anciennes valeurs. Next.js réhydrate ces props sans perdre l'état client
    // (ex: `stepIndex` ci-dessus) ni remonter le composant.
    router.refresh();
    // `onboarding_step` en base ne connaît que les 3 étapes de base (0-2) —
    // les étapes conditionnelles ("essential", "selfie", "recap") retombent
    // sur la plus proche étape de base non encore atteinte.
    const nextKey = stepKeys[next];
    const baseIndex = (BASE_STEP_KEYS as readonly StepKey[]).indexOf(nextKey);
    void saveOnboardingStepAction(baseIndex >= 0 ? baseIndex : 0);
  };

  const currentKey = stepKeys[stepIndex];

  // Renvoie vers une étape précise depuis le message d'erreur de soumission
  // (cf. onboarding-recap-step.tsx) — si cette étape n'est pas présente
  // dans le parcours de CE profil (cas très improbable, ex: "essential" déjà
  // considérée comme acquise au chargement de la page), repli sur la première
  // étape plutôt que de ne rien faire.
  const goToStepKey = (key: OnboardingStepKey) => {
    const index = stepKeys.indexOf(key);
    goTo(index >= 0 ? index : 0);
  };

  // Entonnoir d'onboarding (espace admin) : uniquement pour un vrai nouveau
  // compte, jamais pour un membre déjà onboardé qui revient corriger une section.
  useEffect(() => {
    if (!isRevisit) {
      void logOnboardingEventAction("STEP_VIEWED", currentKey);
    }
  }, [currentKey, isRevisit]);

  const hasEssentialStep = stepKeys.includes("essential");
  const hasSelfieStep = stepKeys.includes("selfie");

  // Rendu de l'étape active — identique sur mobile (feuille) et desktop
  // (carte), seul le conteneur visuel diffère ci-dessous.
  const stepContent = (
    <>
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
      {currentKey === "hobbies" && (
        <OnboardingHobbiesStep profile={profile} onNext={() => goTo(stepIndex + 1)} onBack={() => goTo(stepIndex - 1)} />
      )}
      {currentKey === "recap" && (
        <OnboardingRecapStep
          profile={profile}
          hasEssentialStep={hasEssentialStep}
          hasSelfieStep={hasSelfieStep}
          onBack={() => goTo(stepIndex - 1)}
          onJumpToStep={goToStepKey}
        />
      )}
    </>
  );

  const handleMobileBack = () => {
    if (stepIndex === 0) {
      router.push(isRevisit ? "/profile" : "/feed");
    } else {
      goTo(stepIndex - 1);
    }
  };

  return (
    <>
      {/* Mobile : fond sombre + feuille blanche qui remonte, barre de
          progression segmentée, bouton collé en bas — format exact de
          l'app native (onboarding_flow_page.dart). Desktop inchangé ci-dessous. */}
      <div className="md:hidden fixed inset-0 z-10 flex flex-col bg-foreground">
        <div className="shrink-0 pt-[max(1rem,env(safe-area-inset-top))] px-2 pb-4 flex flex-col gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleMobileBack}
              className="p-2 text-background/90 hover:text-background rounded-full"
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 flex items-center gap-1.5 pr-2">
              {stepKeys.map((key, index) => (
                <div
                  key={key}
                  className={`h-1 flex-1 rounded-full transition-colors ${index <= stepIndex ? "bg-primary" : "bg-background/25"}`}
                />
              ))}
            </div>
          </div>
          <div className="px-3 space-y-1">
            <h2 className="font-display font-semibold text-lg text-background tracking-tight">{STEP_CONTENT[currentKey].title}</h2>
            <p className="text-sm text-background/80">{STEP_CONTENT[currentKey].subtitle}</p>
          </div>
        </div>

        <div className="flex-1 bg-card rounded-t-[28px] overflow-y-auto p-5">{stepContent}</div>
      </div>

      {/* Desktop : mise en page centrée en carte, inchangée. */}
      <div className="hidden md:block space-y-6">
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
          <CardContent className="p-6">{stepContent}</CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Si tu quittes avant la fin, ton profil reste incomplet et invisible pour les autres membres — reviens à tout
          moment depuis Accueil pour reprendre où tu t&apos;étais arrêté(e).
        </p>
      </div>
    </>
  );
}
