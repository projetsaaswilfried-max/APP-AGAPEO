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
  onNext: () => void;
}

/** Étape obligatoire : au moins une photo est requise pour avancer, aucun moyen de la différer. */
export function OnboardingPhotosStep({ userId, initialPhotos, photoVerificationStatus, photoLimit, onNext }: OnboardingPhotosStepProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const hasPhoto = photos.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Tes photos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ajoute au moins une vraie photo depuis ton ordinateur — obligatoire pour continuer. La première ajoutée
          devient ta photo principale.
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
        <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 border border-accent/25 text-xs text-foreground">
          <AlertCircle size={14} className="shrink-0 text-accent" />
          Ajoute une photo pour continuer.
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="primary" size="lg" onClick={onNext} disabled={!hasPhoto} className="w-full sm:w-auto">
          Continuer
        </Button>
      </div>
    </div>
  );
}
