"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { completeEssentialInfoAction } from "@/lib/actions/profile.actions";
import { SUPPORTED_COUNTRIES } from "@/config/countries";
import { AlertCircle } from "lucide-react";

interface OnboardingEssentialInfoStepProps {
  onNext: () => void;
}

/**
 * Étape affichée tant que genre/date de naissance/pays manquent — collectés
 * ici plutôt qu'à l'inscription (pour tout le monde, pas seulement les
 * comptes Google, qui eux ne les transmettent jamais) afin d'alléger le tout
 * premier écran. Ces champs ne sont plus modifiables une fois posés (cf.
 * ProfileEditableSchema).
 */
export function OnboardingEssentialInfoStep({ onNext }: OnboardingEssentialInfoStepProps) {
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // N'affiche les champs manquants en rouge qu'après une première tentative
  // de clic — jamais avant, pour ne pas accueillir la personne avec un
  // formulaire déjà rouge alors qu'elle n'a encore rien pu remplir.
  const [showErrors, setShowErrors] = useState(false);

  const handleContinue = () => {
    setError(null);
    if (!gender || !birthDate || !country) {
      setShowErrors(true);
      return;
    }
    startTransition(async () => {
      const result = await completeEssentialInfoAction({ gender, birthDate, country });
      if (result?.error) {
        setError(result.error);
        return;
      }
      onNext();
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Tes informations essentielles</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Encore quelques informations avant de commencer — elles ne pourront plus être modifiées ensuite.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Genre *</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className={`w-full h-11 rounded-xl border bg-card px-3.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              showErrors && !gender ? "border-destructive focus-visible:ring-destructive" : "border-border"
            }`}
          >
            <option value="">Sélectionner</option>
            <option value="FEMALE">Femme</option>
            <option value="MALE">Homme</option>
          </select>
          {showErrors && !gender && <p className="text-xs text-destructive font-medium pl-1">Champ obligatoire</p>}
        </div>

        <Input
          type="date"
          label="Date de naissance *"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          error={showErrors && !birthDate ? "Champ obligatoire" : undefined}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Pays de résidence *</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={`w-full h-11 rounded-xl border bg-card px-3.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            showErrors && !country ? "border-destructive focus-visible:ring-destructive" : "border-border"
          }`}
        >
          <option value="">Sélectionner un pays</option>
          {SUPPORTED_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {showErrors && !country && <p className="text-xs text-destructive font-medium pl-1">Champ obligatoire</p>}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="primary" size="lg" onClick={handleContinue} isLoading={isPending}>
          Continuer
        </Button>
      </div>
    </div>
  );
}
