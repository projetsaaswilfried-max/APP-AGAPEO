"use client";

import { useState, useTransition } from "react";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { PhotoManager } from "@/components/features/profile/photo-manager";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { AlertCircle, ImageOff } from "lucide-react";
import type { ProfilePhotoRow, VerificationStatus } from "@/lib/supabase/database.types";

interface OnboardingPhotosStepProps {
  userId: string;
  initialPhotos: ProfilePhotoRow[];
  photoVerificationStatus?: VerificationStatus;
  photoLimit: number;
  /** Affiche un mot d'annonce sur l'étape "Selfie" qui suit — évite qu'elle arrive comme une surprise. */
  announceSelfieStep?: boolean;
  onNext: () => void;
  /** Termine l'onboarding immédiatement sans photo ni vérification (format app native : bouton "Passer" sur cette étape uniquement — jamais sur les précédentes). Absent = pas de bouton "Passer" (ex: un membre qui revient juste ajuster ses photos). */
  onSkip?: () => void;
  isSkipping?: boolean;
}

/**
 * Au moins une photo est requise pour avancer normalement — mais, comme sur
 * l'app native, on peut "Passer" cette étape (et donc aussi le selfie qui la
 * suit) pour simplement entrer dans l'application et voir à quoi elle
 * ressemble. Le profil reste alors non soumis/non vérifié tant que la
 * personne ne revient pas compléter cette étape depuis le bandeau "profil
 * incomplet" ou Mon Compte.
 */
export function OnboardingPhotosStep({
  userId,
  initialPhotos,
  photoVerificationStatus,
  photoLimit,
  announceSelfieStep,
  onNext,
  onSkip,
  isSkipping
}: OnboardingPhotosStepProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const hasPhoto = photos.length > 0;
  // N'affiche l'avertissement en rouge qu'après une tentative de clic sans
  // photo — le message neutre reste visible avant ça, à titre indicatif.
  const [showErrors, setShowErrors] = useState(false);
  const [isSkipConfirmOpen, setIsSkipConfirmOpen] = useState(false);
  const [isConfirming, startConfirmTransition] = useTransition();

  // Double vérification côté handler (pas seulement `disabled` sur le
  // bouton) : `onNext` ne doit jamais pouvoir s'exécuter sans photo, quelle
  // que soit la façon dont le clic est déclenché.
  const handleContinue = () => {
    if (!hasPhoto) {
      setShowErrors(true);
      return;
    }
    onNext();
  };

  const handleConfirmSkip = () => {
    setIsSkipConfirmOpen(false);
    startConfirmTransition(() => {
      onSkip?.();
    });
  };

  const skipConfirmContent = (
    <div className="flex flex-col items-center text-center gap-3 py-1">
      <div className="p-3 rounded-full bg-accent/10 text-accent">
        <ImageOff size={24} />
      </div>
      <p className="text-sm text-foreground">
        Sans photo, ton profil ne sera pas vérifié ni visible dans Découvrir. Tu pourras en ajouter plus tard, depuis
        Mon Compte.
      </p>
      <div className="flex flex-col gap-2.5 w-full pt-2">
        <Button variant="primary" className="w-full" onClick={handleConfirmSkip} isLoading={isSkipping || isConfirming}>
          Continuer sans photo
        </Button>
        <Button variant="outline" className="w-full" onClick={() => setIsSkipConfirmOpen(false)} disabled={isSkipping || isConfirming}>
          Annuler
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="hidden md:block">
        <h2 className="text-lg font-display font-semibold text-foreground">Tes photos *</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ajoute au moins une vraie photo pour continuer. La première ajoutée devient ta photo principale.
          {announceSelfieStep && " Juste après, on te demandera un selfie en direct pour confirmer que c'est bien toi."}
        </p>
      </div>

      <PhotoManager
        userId={userId}
        initialPhotos={initialPhotos}
        photoVerificationStatus={photoVerificationStatus}
        photoLimit={photoLimit}
        onPhotosChange={setPhotos}
      />

      {!hasPhoto && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
            showErrors ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-accent/10 border-accent/25 text-foreground"
          }`}
        >
          <AlertCircle size={14} className={`shrink-0 ${showErrors ? "" : "text-accent"}`} />
          Ajoute une photo pour continuer, ou passe cette étape pour l&apos;instant.
        </div>
      )}

      <OnboardingStepFooter
        onSaveAndNext={handleContinue}
        onSkip={onSkip ? () => setIsSkipConfirmOpen(true) : undefined}
        skipLabel="Passer"
        isSaving={isSkipping || isConfirming}
      />

      <div className="md:hidden">
        <BottomSheet isOpen={isSkipConfirmOpen} onClose={() => setIsSkipConfirmOpen(false)} title="Continuer sans photo ?">
          {skipConfirmContent}
        </BottomSheet>
      </div>
      <div className="hidden md:block">
        <Modal isOpen={isSkipConfirmOpen} onClose={() => setIsSkipConfirmOpen(false)} title="Continuer sans photo ?" maxWidth="sm">
          {skipConfirmContent}
        </Modal>
      </div>
    </div>
  );
}
