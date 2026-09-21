"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { DENOMINATION_OPTIONS, DENOMINATION_OTHER, resolveDenomination } from "@/config/denomination-options";

interface DenominationSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

/**
 * Liste déroulante pour la confession chrétienne, avec échappatoire "Autre"
 * qui préserve intégralement une saisie déjà en base ne correspondant à
 * aucune option (ex: une dénomination réelle mais rare, jamais tronquée ni
 * remplacée de force). Choisir une option de la liste réécrit en revanche
 * la valeur avec son orthographe canonique — nettoyage naturel des ~828
 * variantes déjà observées en production, au fil des prochaines
 * modifications de profil plutôt que par une migration forcée.
 */
export function DenominationSelect({ value, onChange, label = "Confession chrétienne", required, error }: DenominationSelectProps) {
  const initial = resolveDenomination(value);
  const [showOther, setShowOther] = useState(initial.isOther && Boolean(value));

  const handleSelectChange = (selected: string) => {
    if (selected === DENOMINATION_OTHER) {
      setShowOther(true);
      onChange("");
    } else {
      setShowOther(false);
      onChange(selected);
    }
  };

  const selectValue = showOther ? DENOMINATION_OTHER : (DENOMINATION_OPTIONS as readonly string[]).includes(initial.canonical) ? initial.canonical : "";

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <select
        value={selectValue}
        onChange={(e) => handleSelectChange(e.target.value)}
        className={`w-full h-11 rounded-xl border bg-card px-3.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          error ? "border-destructive focus-visible:ring-destructive" : "border-border"
        }`}
      >
        <option value="" disabled>
          Sélectionne ta confession
        </option>
        {DENOMINATION_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={DENOMINATION_OTHER}>{DENOMINATION_OTHER}</option>
      </select>
      {showOther && <Input placeholder="Précise ta confession" value={value} onChange={(e) => onChange(e.target.value)} />}
      {error && <p className="text-xs text-destructive font-medium pl-1">{error}</p>}
    </div>
  );
}
