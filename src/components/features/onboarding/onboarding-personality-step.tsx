"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { updateProfileAction } from "@/lib/actions/profile.actions";
import type { ProfileRow } from "@/lib/supabase/database.types";

interface OnboardingPersonalityStepProps {
  profile: ProfileRow;
  onNext: () => void;
}

export function OnboardingPersonalityStep({ profile, onNext }: OnboardingPersonalityStepProps) {
  const [bio, setBio] = useState(profile.bio ?? "");
  const [passions, setPassions] = useState(profile.passions);
  const [hobbies, setHobbies] = useState(profile.hobbies);
  const [qualities, setQualities] = useState(profile.qualities);
  const [isPending, startTransition] = useTransition();
  const [isSkipping, startSkipTransition] = useTransition();

  const handleSaveAndNext = () => {
    startTransition(async () => {
      await updateProfileAction({ bio: bio || null, passions, hobbies, qualities });
      onNext();
    });
  };

  const handleSkip = () => startSkipTransition(async () => onNext());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Ta personnalité</h2>
        <p className="text-sm text-muted-foreground mt-1">Aide les autres à te découvrir avant même d&apos;échanger.</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Présentation</label>
        <Textarea
          placeholder="Parle un peu de toi..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={600}
        />
      </div>

      <TagInput label="Passions" placeholder="Ex : Musique, Voyage..." value={passions} onChange={setPassions} maxTags={12} />
      <TagInput label="Loisirs" placeholder="Ex : Randonnée, Cuisine..." value={hobbies} onChange={setHobbies} maxTags={12} />
      <TagInput label="Tes qualités" placeholder="Ex : Patient(e), Généreux(se)..." value={qualities} onChange={setQualities} maxTags={10} />

      <OnboardingStepFooter onSkip={handleSkip} onSaveAndNext={handleSaveAndNext} isSaving={isPending} isSkipping={isSkipping} />
    </div>
  );
}
