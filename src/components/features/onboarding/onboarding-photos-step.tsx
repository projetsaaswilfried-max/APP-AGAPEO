"use client";

import { useTransition } from "react";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { PhotoManager } from "@/components/features/profile/photo-manager";
import type { ProfilePhotoRow, VerificationStatus } from "@/lib/supabase/database.types";

interface OnboardingPhotosStepProps {
  userId: string;
  initialPhotos: ProfilePhotoRow[];
  photoVerificationStatus?: VerificationStatus;
  onNext: () => void;
}

export function OnboardingPhotosStep({ userId, initialPhotos, photoVerificationStatus, onNext }: OnboardingPhotosStepProps) {
  const [isSkipping, startSkipTransition] = useTransition();
  const handleSkip = () => startSkipTransition(async () => onNext());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Tes photos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ajoute au moins une vraie photo depuis ton ordinateur. La première ajoutée devient ta photo principale. Tu
          peux aussi le faire plus tard depuis ton profil — mais tant qu&apos;il n&apos;y a pas de photo, ton profil ne sera pas
          visible par les autres membres.
        </p>
      </div>

      <PhotoManager userId={userId} initialPhotos={initialPhotos} photoVerificationStatus={photoVerificationStatus} />

      <OnboardingStepFooter onSkip={handleSkip} onSaveAndNext={onNext} isSkipping={isSkipping} saveLabel="Continuer" />
    </div>
  );
}
