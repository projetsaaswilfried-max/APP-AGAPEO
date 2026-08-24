"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { updateProfileAction } from "@/lib/actions/profile.actions";
import type { ProfileRow, MaritalStatusType } from "@/lib/supabase/database.types";

interface OnboardingFaithStepProps {
  profile: ProfileRow;
  onNext: () => void;
  onBack?: () => void;
}

const MARITAL_STATUS_OPTIONS: { value: MaritalStatusType; label: string }[] = [
  { value: "SINGLE_NO_CHILDREN", label: "Célibataire sans enfant" },
  { value: "SINGLE_WITH_CHILDREN", label: "Célibataire avec enfant" },
  { value: "DIVORCED", label: "Divorcé(e)" },
  { value: "WIDOWED", label: "Veuf / Veuve" }
];

export function OnboardingFaithStep({ profile, onNext, onBack }: OnboardingFaithStepProps) {
  const [denomination, setDenomination] = useState(profile.church_denomination ?? "");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatusType | "">(profile.marital_status ?? "");
  const [isPending, startTransition] = useTransition();
  const isComplete = Boolean(denomination.trim()) && Boolean(maritalStatus);

  const handleSaveAndNext = () => {
    if (!isComplete) return;
    startTransition(async () => {
      await updateProfileAction({
        church_denomination: denomination || null,
        marital_status: maritalStatus || null
      });
      onNext();
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Ma foi & ma situation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          L&apos;essentiel pour te présenter à la communauté — les deux champs sont obligatoires pour continuer.
        </p>
      </div>

      <Input
        label="Confession chrétienne"
        placeholder="Ex : Évangélique, Catholique, Baptiste..."
        value={denomination}
        onChange={(e) => setDenomination(e.target.value)}
      />

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Situation matrimoniale</label>
        <select
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value as MaritalStatusType)}
          className="w-full h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Sélectionner</option>
          {MARITAL_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <OnboardingStepFooter onSaveAndNext={handleSaveAndNext} onBack={onBack} isSaving={isPending} isNextDisabled={!isComplete} />
    </div>
  );
}
