"use client";

import React, { useState } from "react";
import { UserProfile } from "@/domain/types/user";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Check } from "lucide-react";

export interface AdditionalInfoUpdate {
  qualities: string[];
  passions: string[];
  familyVision: string;
  desiredChildrenCount: string;
  marriageTimeline: string;
  desiredValues: string[];
}

interface AccountAdditionalInfoFormProps {
  profile: UserProfile;
  onSave: (updated: AdditionalInfoUpdate) => void;
}

const CHILDREN_OPTIONS = ["Je n'en veux pas", "1 à 2", "3 à 4", "5 ou plus", "Ouvert(e) à en discuter"];
const TIMELINE_OPTIONS = ["Dès que possible", "Dans l'année", "Dans 1 à 2 ans", "Pas pressé(e)"];

/**
 * Champs volontairement retirés de l'onboarding pour le raccourcir (redevenus
 * des sujets de discussion entre deux personnes plutôt que des données
 * obligatoires) — un membre qui le souhaite peut quand même les renseigner
 * ici, mais ils ne sont jamais utilisés comme critère de recherche (ni dans
 * l'algorithme de compatibilité, ni dans les filtres de Découvrir).
 */
export function AccountAdditionalInfoForm({ profile, onSave }: AccountAdditionalInfoFormProps) {
  const [qualities, setQualities] = useState(profile.aboutMe.qualities);
  const [passions, setPassions] = useState(profile.aboutMe.passions);
  const [familyVision, setFamilyVision] = useState(profile.marriageVision.familyVision || "");
  const [desiredChildrenCount, setDesiredChildrenCount] = useState(profile.marriageVision.desiredChildrenCount || "");
  const [marriageTimeline, setMarriageTimeline] = useState(profile.marriageVision.timelineYears || "");
  const [desiredValues, setDesiredValues] = useState(profile.preferences.desiredValues);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ qualities, passions, familyVision, desiredChildrenCount, marriageTimeline, desiredValues });
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
          Entièrement facultatif — remplis uniquement ce que tu souhaites partager. Ces informations ne sont jamais
          utilisées pour te proposer des profils dans Découvrir : elles servent uniquement à te présenter, le reste se
          discute directement avec la personne.
        </p>

        <TagInput label="Tes qualités" placeholder="Ex : Patient(e), Généreux(se)..." value={qualities} onChange={setQualities} maxTags={10} />
        <TagInput label="Passions" placeholder="Ex : Musique, Voyage..." value={passions} onChange={setPassions} maxTags={12} />

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

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="md">
            Enregistrer
          </Button>
        </div>
      </Card>
    </form>
  );
}
