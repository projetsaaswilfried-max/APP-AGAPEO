"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { updateProfileAction } from "@/lib/actions/profile.actions";
import { FAITH_ENGAGEMENT_LEVELS } from "@/config/faith-options";
import type { ProfileRow } from "@/lib/supabase/database.types";

interface OnboardingFaithStepProps {
  profile: ProfileRow;
  onNext: () => void;
}

export function OnboardingFaithStep({ profile, onNext }: OnboardingFaithStepProps) {
  const [denomination, setDenomination] = useState(profile.church_denomination ?? "");
  const [engagement, setEngagement] = useState(profile.faith_engagement_level ?? "");
  const [ministry, setMinistry] = useState(profile.ministry ?? "");
  const [baptized, setBaptized] = useState(profile.baptized);
  const [favoriteVerse, setFavoriteVerse] = useState(profile.favorite_verse ?? "");
  const [testimony, setTestimony] = useState(profile.testimony ?? "");
  const [currentGodAction, setCurrentGodAction] = useState(profile.current_god_action ?? "");
  const [isPending, startTransition] = useTransition();
  const [isSkipping, startSkipTransition] = useTransition();

  const handleSaveAndNext = () => {
    startTransition(async () => {
      await updateProfileAction({
        church_denomination: denomination || null,
        faith_engagement_level: engagement || null,
        ministry: ministry || null,
        baptized,
        favorite_verse: favoriteVerse || null,
        testimony: testimony || null,
        current_god_action: currentGodAction || null
      });
      onNext();
    });
  };

  const handleSkip = () => startSkipTransition(async () => onNext());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Ma foi</h2>
        <p className="text-sm text-muted-foreground mt-1">Ce qui définit ton cheminement spirituel.</p>
      </div>

      <Input
        label="Confession chrétienne"
        placeholder="Ex : Évangélique, Catholique, Baptiste..."
        value={denomination}
        onChange={(e) => setDenomination(e.target.value)}
      />

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Niveau d&apos;engagement dans la foi</label>
        <select
          value={engagement}
          onChange={(e) => setEngagement(e.target.value)}
          className="w-full h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Sélectionner</option>
          {FAITH_ENGAGEMENT_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Ministère (optionnel)"
        placeholder="Ex : Louange, École du dimanche..."
        value={ministry}
        onChange={(e) => setMinistry(e.target.value)}
      />

      <Switch checked={baptized} onCheckedChange={setBaptized} label="Je suis baptisé(e)" />

      <Input
        label="Verset préféré (optionnel)"
        placeholder="Ex : Jérémie 29:11"
        value={favoriteVerse}
        onChange={(e) => setFavoriteVerse(e.target.value)}
      />

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Ton témoignage (optionnel)</label>
        <Textarea
          placeholder="Comment as-tu rencontré ta foi ?"
          value={testimony}
          onChange={(e) => setTestimony(e.target.value)}
          maxLength={2000}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Ce que Dieu fait actuellement dans ta vie (optionnel)</label>
        <Textarea
          value={currentGodAction}
          onChange={(e) => setCurrentGodAction(e.target.value)}
          maxLength={1000}
        />
      </div>

      <OnboardingStepFooter onSkip={handleSkip} onSaveAndNext={handleSaveAndNext} isSaving={isPending} isSkipping={isSkipping} />
    </div>
  );
}
