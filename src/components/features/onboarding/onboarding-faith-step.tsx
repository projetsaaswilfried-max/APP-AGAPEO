"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { updateProfileAction } from "@/lib/actions/profile.actions";
import type { ProfileRow, MaritalStatusType } from "@/lib/supabase/database.types";

interface OnboardingFaithStepProps {
  profile: ProfileRow;
  onNext: () => void;
}

const MARITAL_STATUS_OPTIONS: { value: MaritalStatusType; label: string }[] = [
  { value: "SINGLE", label: "Célibataire" },
  { value: "DIVORCED", label: "Divorcé(e)" },
  { value: "WIDOWED", label: "Veuf / Veuve" }
];

export function OnboardingFaithStep({ profile, onNext }: OnboardingFaithStepProps) {
  const [denomination, setDenomination] = useState(profile.church_denomination ?? "");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatusType | "">(profile.marital_status ?? "");
  const [isPending, startTransition] = useTransition();
  const [isSkipping, startSkipTransition] = useTransition();

  const handleSaveAndNext = () => {
    startTransition(async () => {
      await updateProfileAction({
        church_denomination: denomination || null,
        marital_status: maritalStatus || null
      });
      onNext();
    });
  };

  const handleSkip = () => startSkipTransition(async () => onNext());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Ma foi & ma situation</h2>
        <p className="text-sm text-muted-foreground mt-1">L&apos;essentiel pour te présenter à la communauté.</p>
      </div>

      <Input
        label="Confession chrétienne"
        placeholder="Ex : Évangélique, Catholique, Baptiste..."
        value={denomination}
        onChange={(e) => setDenomination(e.target.value)}
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Situation matrimoniale</label>
        <div className="grid grid-cols-3 gap-2">
          {MARITAL_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMaritalStatus(opt.value)}
              className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                maritalStatus === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <OnboardingStepFooter onSkip={handleSkip} onSaveAndNext={handleSaveAndNext} isSaving={isPending} isSkipping={isSkipping} />
    </div>
  );
}
