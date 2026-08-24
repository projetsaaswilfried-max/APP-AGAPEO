"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { updateProfileAction, completeOnboardingAction } from "@/lib/actions/profile.actions";
import { submitVerificationRequestAction } from "@/lib/actions/verification.actions";
import { SelfieCaptureModal } from "@/components/features/account/selfie-capture-modal";
import { AlertCircle, ArrowRight } from "lucide-react";
import type { ProfileRow, MaritalStatusType } from "@/lib/supabase/database.types";

interface OnboardingPreferencesStepProps {
  profile: ProfileRow;
  onBack?: () => void;
}

const MARITAL_STATUS_OPTIONS: { value: MaritalStatusType; label: string }[] = [
  { value: "SINGLE_NO_CHILDREN", label: "Célibataire sans enfant" },
  { value: "SINGLE_WITH_CHILDREN", label: "Célibataire avec enfant" },
  { value: "DIVORCED", label: "Divorcé(e)" },
  { value: "WIDOWED", label: "Veuf / Veuve" }
];

export function OnboardingPreferencesStep({ profile, onBack }: OnboardingPreferencesStepProps) {
  const [bio, setBio] = useState(profile.bio ?? "");
  const [hobbies, setHobbies] = useState(profile.hobbies);
  const [whyMarriage, setWhyMarriage] = useState(profile.why_marriage ?? "");
  const [coreValues, setCoreValues] = useState(profile.core_values);
  const [ageMin, setAgeMin] = useState(profile.desired_age_min);
  const [ageMax, setAgeMax] = useState(profile.desired_age_max);
  const [desiredMaritalStatuses, setDesiredMaritalStatuses] = useState<MaritalStatusType[]>(profile.desired_marital_statuses);
  const [desiredCountries, setDesiredCountries] = useState(profile.desired_countries);
  const [isPending, startTransition] = useTransition();
  const [isSkipping, startSkipTransition] = useTransition();
  const [isFinishing, startFinishTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSelfieModalOpen, setIsSelfieModalOpen] = useState(false);

  const toggleMaritalStatus = (value: MaritalStatusType) => {
    setDesiredMaritalStatuses((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const savePreferences = () =>
    updateProfileAction({
      bio: bio || null,
      hobbies,
      why_marriage: whyMarriage || null,
      core_values: coreValues,
      desired_age_min: ageMin,
      desired_age_max: ageMax,
      desired_marital_statuses: desiredMaritalStatuses,
      desired_countries: desiredCountries
    });

  /** Bouton principal : enregistre le profil, puis ouvre la capture du selfie de vérification. */
  const handleSubmit = () => {
    setSubmitError(null);
    startTransition(async () => {
      await savePreferences();
      setIsSelfieModalOpen(true);
    });
  };

  /** Selfie envoyé : soumet réellement pour vérification, puis termine l'onboarding (redirige). */
  const handleSelfieCaptured = (selfieStoragePath: string) => {
    setIsSelfieModalOpen(false);
    startTransition(async () => {
      const result = await submitVerificationRequestAction(selfieStoragePath);
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
        <h2 className="text-lg font-display font-semibold text-foreground">Ton profil & ce que tu recherches</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ces informations te présentent aux autres et alimentent tes recommandations dans Découvrir — tu pourras les
          affiner à tout moment.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Présentation</label>
        <Textarea placeholder="Parle un peu de toi..." value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} />
      </div>

      <TagInput label="Loisirs" placeholder="Ex : Randonnée, Cuisine..." value={hobbies} onChange={setHobbies} maxTags={12} />

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Pourquoi recherches-tu le mariage ?</label>
        <Textarea value={whyMarriage} onChange={(e) => setWhyMarriage(e.target.value)} maxLength={1000} />
      </div>

      <TagInput
        label="Tes valeurs fondamentales"
        placeholder="Ex : Foi, Famille, Honnêteté..."
        value={coreValues}
        onChange={setCoreValues}
        maxTags={12}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input type="number" label="Âge minimum" min={18} max={99} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} />
        <Input type="number" label="Âge maximum" min={18} max={99} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Situation matrimoniale acceptée</label>
        <div className="grid grid-cols-2 gap-2">
          {MARITAL_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleMaritalStatus(opt.value)}
              className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                desiredMaritalStatuses.includes(opt.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <TagInput label="Pays acceptés" placeholder="Ex : France, Canada..." value={desiredCountries} onChange={setDesiredCountries} maxTags={8} />

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
        En soumettant, on te demandera un selfie en direct (comparé à tes photos par notre équipe), puis ton profil
        sera envoyé pour vérification — tu recevras un email de confirmation. Retrouve aussi ce bouton à tout moment
        depuis{" "}
        <Link href="/profile" className="text-accent underline underline-offset-2">
          Mon Compte & Sécurité
        </Link>
        .
      </p>

      <OnboardingStepFooter
        onSkip={handleSkip}
        onSaveAndNext={handleSubmit}
        onBack={onBack}
        isSaving={isPending || isFinishing}
        isSkipping={isSkipping}
        skipLabel="Terminer plus tard"
        saveLabel="Soumettre"
      />

      <SelfieCaptureModal
        isOpen={isSelfieModalOpen}
        userId={profile.id}
        onClose={() => setIsSelfieModalOpen(false)}
        onCaptured={handleSelfieCaptured}
      />
    </div>
  );
}
