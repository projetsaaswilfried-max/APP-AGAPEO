"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { DenominationSelect } from "@/components/features/profile/denomination-select";
import { resolveDenomination } from "@/config/denomination-options";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { updateProfileAction } from "@/lib/actions/profile.actions";
import { MARITAL_STATUS_OPTIONS } from "@/domain/marital-status";
import type { ProfileRow, MaritalStatusType } from "@/lib/supabase/database.types";

interface OnboardingFaithStepProps {
  profile: ProfileRow;
  onNext: () => void;
  onBack?: () => void;
}

export function OnboardingFaithStep({ profile, onNext, onBack }: OnboardingFaithStepProps) {
  const [denomination, setDenomination] = useState(profile.church_denomination ?? "");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatusType | "">(profile.marital_status ?? "");
  const [heightCm, setHeightCm] = useState(profile.height_cm ? String(profile.height_cm) : "");
  const [isPending, startTransition] = useTransition();
  const [showErrors, setShowErrors] = useState(false);
  const isComplete = Boolean(denomination.trim()) && Boolean(maritalStatus);

  const handleSaveAndNext = () => {
    if (!isComplete) {
      setShowErrors(true);
      return;
    }
    const parsedHeight = heightCm.trim() ? Number(heightCm) : null;
    // Réécrit vers l'orthographe canonique à CHAQUE enregistrement, même si
    // la personne n'a pas retouché le menu déroulant — sinon une ancienne
    // saisie libre reconnue et déjà affichée normalisée à l'écran (ex:
    // "evangelique" -> "Évangélique" dans le menu) restait telle quelle en
    // base tant que personne ne cliquait dessus une deuxième fois.
    const normalizedDenomination = resolveDenomination(denomination).canonical;
    startTransition(async () => {
      await updateProfileAction({
        church_denomination: normalizedDenomination || null,
        marital_status: maritalStatus || null,
        height_cm: parsedHeight && parsedHeight >= 120 && parsedHeight <= 230 ? parsedHeight : null
      });
      onNext();
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Ma foi & ma situation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          L&apos;essentiel pour te présenter à la communauté — confession et situation matrimoniale sont obligatoires, la taille est facultative.
        </p>
      </div>

      <DenominationSelect
        required
        value={denomination}
        onChange={setDenomination}
        error={showErrors && !denomination.trim() ? "Champ obligatoire" : undefined}
      />

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Situation matrimoniale *</label>
        <select
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value as MaritalStatusType)}
          className={`w-full h-11 rounded-xl border bg-card px-3.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            showErrors && !maritalStatus ? "border-destructive focus-visible:ring-destructive" : "border-border"
          }`}
        >
          <option value="">Sélectionner</option>
          {MARITAL_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {showErrors && !maritalStatus && <p className="text-xs text-destructive font-medium pl-1">Champ obligatoire</p>}
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
