"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, AlertCircle } from "lucide-react";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { completeOnboardingAction } from "@/lib/actions/profile.actions";
import { submitVerificationRequestAction } from "@/lib/actions/verification.actions";
import { SelfieCaptureModal } from "@/components/features/account/selfie-capture-modal";
import { MARITAL_STATUS_OPTIONS } from "@/domain/marital-status";
import type { OnboardingStepKey } from "@/domain/profile-completeness";
import type { ProfileRow } from "@/lib/supabase/database.types";

const STEP_LABELS: Record<OnboardingStepKey, string> = {
  essential: "Tes informations",
  photos: "Photos",
  selfie: "Selfie",
  faith: "Ta foi",
  hobbies: "Tes passions",
  recap: "Récapitulatif"
};

interface OnboardingRecapStepProps {
  profile: ProfileRow;
  /** Les étapes "essential"/"selfie" n'existent pas toujours dans le parcours (déjà verrouillée, ou déjà vérifié) — une ligne dont l'étape n'est pas dans le parcours courant n'est pas cliquable. */
  hasEssentialStep: boolean;
  hasSelfieStep: boolean;
  onBack?: () => void;
  onJumpToStep: (step: OnboardingStepKey) => void;
}

function computeAge(birthDate: string | null): string {
  if (!birthDate) return "Non renseigné";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "Non renseigné";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return `${age} ans`;
}

interface RecapRowProps {
  label: string;
  value: string;
  onClick?: () => void;
}

function RecapRow({ label, value, onClick }: RecapRowProps) {
  const content = (
    <>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground truncate">{value}</p>
      </div>
      {onClick && <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
    </>
  );
  if (!onClick) {
    return <div className="flex items-center gap-3 px-4 py-3">{content}</div>;
  }
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors rounded-xl">
      {content}
    </button>
  );
}

/**
 * Relecture finale avant validation — purement en lecture, aucun champ ici
 * n'est modifié directement (chaque ligne renvoie vers l'étape qui le
 * possède). C'est cette étape, et non "Tes passions", qui déclenche
 * désormais la vraie soumission (sauvegarde déjà faite étape par étape avant
 * d'arriver ici) — reprend exactement la logique qui vivait auparavant dans
 * l'étape "Préférences".
 */
export function OnboardingRecapStep({ profile, hasEssentialStep, hasSelfieStep, onBack, onJumpToStep }: OnboardingRecapStepProps) {
  const [isPending, startTransition] = useTransition();
  const [isFinishing, startFinishTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [missingStep, setMissingStep] = useState<OnboardingStepKey | null>(null);
  const [isSelfieModalOpen, setIsSelfieModalOpen] = useState(false);
  const needsVerificationSubmission = profile.photo_verification_status === "UNVERIFIED" || profile.photo_verification_status === "REJECTED";
  const hasPendingSelfie = Boolean(profile.pending_selfie_storage_path);
  const maritalStatusLabel = MARITAL_STATUS_OPTIONS.find((opt) => opt.value === profile.marital_status)?.label ?? "Non renseigné";
  const genderLabel = profile.gender === "FEMALE" ? "Femme" : profile.gender === "MALE" ? "Homme" : "Non renseigné";

  const handleSubmit = () => {
    setSubmitError(null);
    setMissingStep(null);
    startTransition(async () => {
      if (!needsVerificationSubmission) {
        await completeOnboardingAction();
        return;
      }
      if (hasPendingSelfie) {
        const result = await submitVerificationRequestAction();
        if (result?.error) {
          setSubmitError(result.error);
          setMissingStep(result.missingStep ?? null);
          return;
        }
        await completeOnboardingAction();
      } else {
        setIsSelfieModalOpen(true);
      }
    });
  };

  /** Selfie envoyé : soumet réellement pour vérification, puis termine l'onboarding (redirige). */
  const handleSelfieCaptured = (selfieStoragePath: string) => {
    setIsSelfieModalOpen(false);
    startTransition(async () => {
      const result = await submitVerificationRequestAction(selfieStoragePath);
      if (result?.error) {
        setSubmitError(result.error);
        setMissingStep(result.missingStep ?? null);
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

  return (
    <div className="space-y-5">
      <div className="hidden md:block">
        <h2 className="text-lg font-display font-semibold text-foreground">Récapitulatif</h2>
        <p className="text-sm text-muted-foreground mt-1">Vérifie avant de valider ton profil.</p>
      </div>

      <div className="flex justify-center">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="Ta photo de profil" className="w-20 h-20 rounded-full object-cover border border-border/60" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-secondary border border-border/60" />
        )}
      </div>

      <div className="rounded-2xl border border-border/60 divide-y divide-border/40 overflow-hidden">
        <RecapRow label="Genre" value={genderLabel} onClick={hasEssentialStep ? () => onJumpToStep("essential") : undefined} />
        <RecapRow label="Âge" value={computeAge(profile.birth_date)} onClick={hasEssentialStep ? () => onJumpToStep("essential") : undefined} />
        <RecapRow label="Pays" value={profile.country ?? "Non renseigné"} onClick={hasEssentialStep ? () => onJumpToStep("essential") : undefined} />
        <RecapRow label="Confession" value={profile.church_denomination ?? "Non renseigné"} onClick={() => onJumpToStep("faith")} />
        <RecapRow label="Situation" value={maritalStatusLabel} onClick={() => onJumpToStep("faith")} />
        <RecapRow label="Pourquoi le mariage" value={profile.why_marriage ?? "Non renseigné"} onClick={() => onJumpToStep("faith")} />
        <RecapRow label="Centres d'intérêt" value={profile.hobbies.length > 0 ? profile.hobbies.join(", ") : "Aucun"} onClick={() => onJumpToStep("hobbies")} />
        <RecapRow label="Présente-toi" value={profile.bio || "Non renseigné"} onClick={() => onJumpToStep("hobbies")} />
        <RecapRow label="Taille" value={profile.height_cm ? `${profile.height_cm} cm` : "Non renseignée"} onClick={() => onJumpToStep("hobbies")} />
        <RecapRow label="Photo" value={profile.avatar_url ? "Ajoutée" : "Aucune"} onClick={() => onJumpToStep("photos")} />
        {hasSelfieStep && (
          <RecapRow label="Selfie de vérification" value={hasPendingSelfie ? "Ajouté" : "Aucun"} onClick={() => onJumpToStep("selfie")} />
        )}
      </div>

      {submitError && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 space-y-2.5">
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {submitError}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {missingStep && missingStep !== "recap" && (
              <button
                type="button"
                onClick={() => onJumpToStep(missingStep)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-95 transition-opacity rounded-full px-3.5 py-1.5"
              >
                Compléter « {STEP_LABELS[missingStep]} » <ChevronRight size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={handleFinishWithoutSubmitting}
              disabled={isFinishing}
              className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              Terminer sans soumettre pour l&apos;instant
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {needsVerificationSubmission ? (
          <>
            {hasPendingSelfie
              ? "En soumettant, ton profil (et le selfie déjà capturé) sera envoyé pour vérification"
              : "En soumettant, on te demandera un selfie en direct (comparé à tes photos par notre équipe), puis ton profil sera envoyé pour vérification"}
            . Notre équipe l&apos;examine généralement sous <strong className="text-foreground font-semibold">{profile.is_premium ? "24h" : "48h"}</strong>, et tu recevras un
            email de confirmation. Retrouve aussi ce parcours à tout moment depuis{" "}
            <Link href="/profile" className="text-accent underline underline-offset-2">
              Mon Compte & Sécurité
            </Link>
            .
          </>
        ) : (
          "Ton profil est déjà vérifié : ces modifications sont enregistrées directement, sans nouvelle demande de vérification."
        )}
      </p>

      <OnboardingStepFooter
        onSaveAndNext={handleSubmit}
        onBack={onBack}
        isSaving={isPending || isFinishing}
        saveLabel={needsVerificationSubmission ? "Soumettre" : "Enregistrer"}
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
