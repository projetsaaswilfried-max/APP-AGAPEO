"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhotoManager } from "@/components/features/profile/photo-manager";
import { AlertCircle } from "lucide-react";
import type { ProfilePhotoRow, VerificationStatus } from "@/lib/supabase/database.types";

interface OnboardingPhotosStepProps {
  userId: string;
  initialPhotos: ProfilePhotoRow[];
  photoVerificationStatus?: VerificationStatus;
  photoLimit: number;
  /** Affiche un mot d'annonce sur l'étape "Selfie" qui suit — évite qu'elle arrive comme une surprise. */
  announceSelfieStep?: boolean;
  onNext: () => void;
}

/** Étape obligatoire : au moins une photo est requise pour avancer, aucun moyen de la différer. */
export function OnboardingPhotosStep({ userId, initialPhotos, photoVerificationStatus, photoLimit, announceSelfieStep, onNext }: OnboardingPhotosStepProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const hasPhoto = photos.length > 0;
  // N'affiche l'avertissement en rouge qu'après une tentative de clic sans
  // photo — le message neutre reste visible avant ça, à titre indicatif.
  const [showErrors, setShowErrors] = useState(false);

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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Tes photos *</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ajoute au moins une vraie photo depuis ton ordinateur — obligatoire pour continuer. La première ajoutée
          devient ta photo principale.
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
          Ajoute une photo pour continuer.
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="primary" size="lg" onClick={handleContinue} className="w-full sm:w-auto">
          Continuer
        </Button>
      </div>
    </div>
  );
}
