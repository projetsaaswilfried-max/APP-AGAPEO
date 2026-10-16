"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
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
  const [whyMarriage, setWhyMarriage] = useState(profile.why_marriage ?? "");
  const [isPending, startTransition] = useTransition();
  const [showErrors, setShowErrors] = useState(false);
  const isComplete = Boolean(denomination.trim()) && Boolean(maritalStatus) && Boolean(whyMarriage.trim());

  const handleSaveAndNext = () => {
    if (!isComplete) {
      setShowErrors(true);
      return;
    }
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
        why_marriage: whyMarriage || null
      });
      onNext();
    });
  };

  return (
    <div className="space-y-5">
      <div className="hidden md:block">
        <h2 className="text-lg font-display font-semibold text-foreground">Ta foi</h2>
        <p className="text-sm text-muted-foreground mt-1">Confession, situation et pourquoi tu cherches le mariage.</p>
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

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Pourquoi recherches-tu le mariage ? *</label>
        <Textarea
          value={whyMarriage}
          onChange={(e) => setWhyMarriage(e.target.value)}
          maxLength={1000}
          error={showErrors && !whyMarriage.trim() ? "Champ obligatoire" : undefined}
        />
      </div>

      <OnboardingStepFooter onSaveAndNext={handleSaveAndNext} onBack={onBack} isSaving={isPending} />
    </div>
  );
}
