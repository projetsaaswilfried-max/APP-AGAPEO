"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleChipGroup } from "@/components/ui/toggle-chip-group";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { updateProfileAction } from "@/lib/actions/profile.actions";
import { MAX_INTERESTS, resolveInterests } from "@/config/interest-options";
import { useInterestOptions } from "@/core/hooks/use-interest-options";
import type { ProfileRow } from "@/lib/supabase/database.types";

interface OnboardingHobbiesStepProps {
  profile: ProfileRow;
  onNext: () => void;
  onBack?: () => void;
}

/** Centres d'intérêt, présentation et taille — tout le reste (vision du mariage, préférences de recherche) vit désormais dans les étapes "Ma foi" et "Récapitulatif". */
export function OnboardingHobbiesStep({ profile, onNext, onBack }: OnboardingHobbiesStepProps) {
  const interestOptions = useInterestOptions();
  const [bio, setBio] = useState(profile.bio ?? "");
  // Reconnaît les anciennes saisies libres (avant le passage aux cases à
  // cocher) pour pré-cocher ce qui est reconnaissable, plutôt que de
  // repartir d'une liste vide pour un profil qui avait déjà rempli ce champ.
  const [hobbies, setHobbies] = useState<string[]>(() => resolveInterests(profile.hobbies));
  const [heightCm, setHeightCm] = useState(profile.height_cm ? String(profile.height_cm) : "");
  const [isPending, startTransition] = useTransition();

  const handleSaveAndNext = () => {
    const parsedHeight = heightCm.trim() ? Number(heightCm) : null;
    startTransition(async () => {
      await updateProfileAction({
        bio: bio || null,
        hobbies,
        height_cm: parsedHeight && parsedHeight >= 120 && parsedHeight <= 230 ? parsedHeight : null
      });
      onNext();
    });
  };

  return (
    <div className="space-y-5">
      <div className="hidden md:block">
        <h2 className="text-lg font-display font-semibold text-foreground">Tes passions</h2>
        <p className="text-sm text-muted-foreground mt-1">Tes centres d&apos;intérêt, ta présentation et ta taille.</p>
      </div>

      <ToggleChipGroup label="Centres d'intérêt" options={interestOptions} value={hobbies} onChange={setHobbies} maxSelected={MAX_INTERESTS} />

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Présentation</label>
        <Textarea placeholder="Parle un peu de toi..." value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} />
      </div>

      <Input
        label="Taille (en cm)"
        type="number"
        inputMode="numeric"
        min={120}
        max={230}
        placeholder="Ex : 175"
        value={heightCm}
        onChange={(e) => setHeightCm(e.target.value)}
      />

      <OnboardingStepFooter onSaveAndNext={handleSaveAndNext} onBack={onBack} isSaving={isPending} />
    </div>
  );
}
