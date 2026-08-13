"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { updateProfileAction } from "@/lib/actions/profile.actions";
import type { ProfileRow } from "@/lib/supabase/database.types";

interface OnboardingMarriageVisionStepProps {
  profile: ProfileRow;
  onNext: () => void;
}

const CHILDREN_OPTIONS = ["Je n'en veux pas", "1 à 2", "3 à 4", "5 ou plus", "Ouvert(e) à en discuter"];
const TIMELINE_OPTIONS = ["Dès que possible", "Dans l'année", "Dans 1 à 2 ans", "Pas pressé(e)"];

export function OnboardingMarriageVisionStep({ profile, onNext }: OnboardingMarriageVisionStepProps) {
  const [whyMarriage, setWhyMarriage] = useState(profile.why_marriage ?? "");
  const [familyVision, setFamilyVision] = useState(profile.family_vision ?? "");
  const [desiredChildrenCount, setDesiredChildrenCount] = useState(profile.desired_children_count ?? "");
  const [marriageTimeline, setMarriageTimeline] = useState(profile.marriage_timeline ?? "");
  const [relocationReady, setRelocationReady] = useState(profile.relocation_ready);
  const [coreValues, setCoreValues] = useState(profile.core_values);
  const [isPending, startTransition] = useTransition();
  const [isSkipping, startSkipTransition] = useTransition();

  const handleSaveAndNext = () => {
    startTransition(async () => {
      await updateProfileAction({
        why_marriage: whyMarriage || null,
        family_vision: familyVision || null,
        desired_children_count: desiredChildrenCount || null,
        marriage_timeline: marriageTimeline || null,
        relocation_ready: relocationReady,
        core_values: coreValues
      });
      onNext();
    });
  };

  const handleSkip = () => startSkipTransition(async () => onNext());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Ta vision du mariage</h2>
        <p className="text-sm text-muted-foreground mt-1">Le cœur de ta démarche sur la plateforme.</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Pourquoi recherches-tu le mariage ?</label>
        <Textarea value={whyMarriage} onChange={(e) => setWhyMarriage(e.target.value)} maxLength={1000} />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Ta vision de la famille (optionnel)</label>
        <Textarea value={familyVision} onChange={(e) => setFamilyVision(e.target.value)} maxLength={1000} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Enfants souhaités</label>
          <select
            value={desiredChildrenCount}
            onChange={(e) => setDesiredChildrenCount(e.target.value)}
            className="w-full h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Sélectionner</option>
            {CHILDREN_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Délai souhaité</label>
          <select
            value={marriageTimeline}
            onChange={(e) => setMarriageTimeline(e.target.value)}
            className="w-full h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Sélectionner</option>
            {TIMELINE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Switch
        checked={relocationReady}
        onCheckedChange={setRelocationReady}
        label="Disponible à déménager pour le mariage"
      />

      <TagInput label="Tes valeurs fondamentales" placeholder="Ex : Foi, Famille, Honnêteté..." value={coreValues} onChange={setCoreValues} maxTags={12} />

      <OnboardingStepFooter onSkip={handleSkip} onSaveAndNext={handleSaveAndNext} isSaving={isPending} isSkipping={isSkipping} />
    </div>
  );
}
