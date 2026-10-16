"use client";

import React, { useState } from "react";
import { UserProfile } from "@/domain/types/user";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { ToggleChipGroup } from "@/components/ui/toggle-chip-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Check } from "lucide-react";
import { MAX_INTERESTS, resolveInterests } from "@/config/interest-options";
import { useInterestOptions } from "@/core/hooks/use-interest-options";
import { SUPPORTED_COUNTRIES } from "@/config/countries";
import { MARITAL_STATUS_OPTIONS } from "@/domain/marital-status";
import type { MaritalStatusType } from "@/lib/supabase/database.types";

export interface AdditionalInfoUpdate {
  qualities: string[];
  hobbies: string[];
  familyVision: string;
  desiredChildrenCount: string;
  marriageTimeline: string;
  desiredValues: string[];
  coreValues: string[];
  desiredAgeMin: number;
  desiredAgeMax: number;
  desiredMaritalStatuses: MaritalStatusType[];
  desiredCountries: string[];
}

interface AccountAdditionalInfoFormProps {
  profile: UserProfile;
  onSave: (updated: AdditionalInfoUpdate) => void;
}

const CHILDREN_OPTIONS = ["Je n'en veux pas", "1 à 2", "3 à 4", "5 ou plus", "Ouvert(e) à en discuter"];
const TIMELINE_OPTIONS = ["Dès que possible", "Dans l'année", "Dans 1 à 2 ans", "Pas pressé(e)"];

/**
 * Deux familles de champs, pour deux raisons différentes :
 * - qualities/familyVision/desiredChildrenCount/marriageTimeline/desiredValues :
 *   volontairement retirés de l'onboarding pour le raccourcir (redevenus des
 *   sujets de discussion entre deux personnes plutôt que des données
 *   obligatoires). hobbies reste aussi édité dans l'onboarding "Tes passions"
 *   (même champ) car il alimente le score de compatibilité (cf.
 *   src/domain/matching/compatibility.ts) — seule exception à "non utilisé
 *   comme critère de recherche".
 * - coreValues/desiredAgeMin/desiredAgeMax/desiredMaritalStatuses/desiredCountries :
 *   n'ont jamais existé dans l'onboarding de l'app mobile native — ce sont
 *   des préférences de matching réglées ici uniquement, jamais à l'inscription.
 */
export function AccountAdditionalInfoForm({ profile, onSave }: AccountAdditionalInfoFormProps) {
  const interestOptions = useInterestOptions();
  const [qualities, setQualities] = useState(profile.aboutMe.qualities);
  const [hobbies, setHobbies] = useState<string[]>(() => resolveInterests(profile.aboutMe.hobbies));
  const [familyVision, setFamilyVision] = useState(profile.marriageVision.familyVision || "");
  const [desiredChildrenCount, setDesiredChildrenCount] = useState(profile.marriageVision.desiredChildrenCount || "");
  const [marriageTimeline, setMarriageTimeline] = useState(profile.marriageVision.timelineYears || "");
  const [desiredValues, setDesiredValues] = useState(profile.preferences.desiredValues);
  const [coreValues, setCoreValues] = useState(profile.marriageVision.coreValues);
  const [desiredAgeMin, setDesiredAgeMin] = useState(profile.preferences.desiredAgeMin);
  const [desiredAgeMax, setDesiredAgeMax] = useState(profile.preferences.desiredAgeMax);
  const [desiredMaritalStatuses, setDesiredMaritalStatuses] = useState(profile.preferences.desiredMaritalStatuses);
  const [desiredCountries, setDesiredCountries] = useState(profile.preferences.desiredCountries);
  const [isSaved, setIsSaved] = useState(false);

  const toggleDesiredMaritalStatus = (value: MaritalStatusType) => {
    setDesiredMaritalStatuses((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      qualities,
      hobbies,
      familyVision,
      desiredChildrenCount,
      marriageTimeline,
      desiredValues,
      coreValues,
      desiredAgeMin,
      desiredAgeMax,
      desiredMaritalStatuses,
      desiredCountries
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 select-none">
      <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-base font-display font-semibold text-foreground tracking-tight">Informations complémentaires</h2>
          </div>
          {isSaved && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <Check size={14} /> Modifications enregistrées
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground -mt-2">
          Entièrement facultatif — remplis uniquement ce que tu souhaites partager. En dehors des centres d&apos;intérêt
          (qui comptent dans ton score de compatibilité), ces informations ne servent qu&apos;à te présenter ou à affiner
          tes recommandations dans Découvrir : le reste se discute directement avec la personne.
        </p>

        <TagInput label="Tes valeurs fondamentales" placeholder="Ex : Foi, Famille, Honnêteté..." value={coreValues} onChange={setCoreValues} maxTags={12} />
        <TagInput label="Tes qualités" placeholder="Ex : Patient(e), Généreux(se)..." value={qualities} onChange={setQualities} maxTags={10} />
        <ToggleChipGroup label="Centres d'intérêt" options={interestOptions} value={hobbies} onChange={setHobbies} maxSelected={MAX_INTERESTS} />

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Ta vision de la famille</label>
          <Textarea value={familyVision} onChange={(e) => setFamilyVision(e.target.value)} maxLength={1000} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <TagInput
          label="Valeurs importantes chez l'autre"
          placeholder="Ex : Foi, Bienveillance..."
          value={desiredValues}
          onChange={setDesiredValues}
          maxTags={12}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Tranche d&apos;âge recherchée</label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Âge minimum"
              min={18}
              max={99}
              value={desiredAgeMin}
              onChange={(e) => setDesiredAgeMin(Number(e.target.value))}
            />
            <Input
              type="number"
              label="Âge maximum"
              min={18}
              max={99}
              value={desiredAgeMax}
              onChange={(e) => setDesiredAgeMax(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Situation matrimoniale acceptée</label>
          <div className="grid grid-cols-2 gap-2">
            {MARITAL_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleDesiredMaritalStatus(opt.value)}
                className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                  desiredMaritalStatuses.includes(opt.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Pays acceptés</label>
          <TagInput placeholder="Ex : France, Canada..." value={desiredCountries} onChange={setDesiredCountries} maxTags={8} />
          <p className="text-[11px] text-muted-foreground">
            Suggestions : {SUPPORTED_COUNTRIES.slice(0, 6).join(", ")}...
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="md">
            Enregistrer
          </Button>
        </div>
      </Card>
    </form>
  );
}
