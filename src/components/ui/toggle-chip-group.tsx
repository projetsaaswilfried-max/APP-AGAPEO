"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface ToggleChipGroupProps {
  label?: string;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Au-delà, les cases non cochées se désactivent plutôt que de disparaître — la personne voit tout de suite pourquoi elle ne peut plus en ajouter. */
  maxSelected?: number;
  className?: string;
}

/**
 * Sélection multiple à partir d'une liste FERMÉE d'options, sous forme de
 * puces à cocher — remplace un champ texte libre (`TagInput`) quand le
 * produit veut normaliser la saisie (recherche/filtrage fiables, plus de
 * variantes d'orthographe). Repose sur le même principe de bouton-bascule
 * que la grille "Situation matrimoniale acceptée" déjà utilisée dans
 * l'onboarding, mais en `flex-wrap` plutôt qu'une grille à colonnes fixes :
 * s'adapte à n'importe quelle longueur de libellé et n'importe quelle
 * largeur d'écran, y compris mobile, sans colonne coupée à mi-mot.
 */
export function ToggleChipGroup({ label, options, value, onChange, maxSelected, className }: ToggleChipGroupProps) {
  const reachedLimit = maxSelected !== undefined && value.length >= maxSelected;

  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
      return;
    }
    if (reachedLimit) return;
    onChange([...value, option]);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-foreground">{label}</label>
          {maxSelected !== undefined && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              {value.length}/{maxSelected}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              disabled={!selected && reachedLimit}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                selected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-secondary"
              )}
            >
              {selected && <Check size={13} />}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
