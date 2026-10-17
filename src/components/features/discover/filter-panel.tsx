"use client";

import React, { useEffect, useState } from "react";
import { DiscoverFilterCriteria } from "@/domain/types/discover";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SUPPORTED_COUNTRIES } from "@/config/countries";
import { DENOMINATION_OPTIONS } from "@/config/denomination-options";
import { MARITAL_STATUS_OPTIONS } from "@/domain/marital-status";
import { SlidersHorizontal, RefreshCw, X, Lock } from "lucide-react";

interface FilterPanelProps {
  filters: DiscoverFilterCriteria;
  onChangeFilters: (filters: DiscoverFilterCriteria) => void;
  onResetFilters: () => void;
  onClose?: () => void;
  /** Âge, pays et statut restent gratuits — le reste des filtres est réservé Premium. */
  isPremium: boolean;
  onRequirePremium: () => void;
}

const selectClass =
  "w-full h-9 rounded-xl border border-border/60 bg-secondary/40 px-3 text-xs text-foreground focus:outline-none cursor-pointer";
const inputClass = "w-full h-9 rounded-xl border border-border/60 bg-secondary/40 px-3 text-xs text-foreground focus:outline-none";

interface AdvancedFieldProps {
  isPremium: boolean;
  onRequirePremium: () => void;
  children: React.ReactNode;
}

function AdvancedField({ isPremium, onRequirePremium, children }: AdvancedFieldProps) {
  if (isPremium) return <>{children}</>;
  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none select-none" aria-hidden>
        {children}
      </div>
      <button
        type="button"
        onClick={onRequirePremium}
        className="absolute inset-0 flex items-center justify-end pr-2.5 rounded-xl"
        title="Filtre réservé aux membres Premium"
      >
        <Lock size={13} className="text-primary" />
      </button>
    </div>
  );
}

export function FilterPanel({ filters, onChangeFilters, onResetFilters, onClose, isPremium, onRequirePremium }: FilterPanelProps) {
  // Brouillon : les choix ne s'appliquent (et ne relancent la recherche) qu'au toucher sur « Valider ».
  const [draft, setDraft] = useState<DiscoverFilterCriteria>(filters);
  useEffect(() => setDraft(filters), [filters]);
  const update = (patch: Partial<DiscoverFilterCriteria>) => setDraft((prev) => ({ ...prev, ...patch }));
  const handleValidate = () => {
    onChangeFilters(draft);
    onClose?.();
  };

  const header = (
    <div className="flex items-center justify-between border-b border-border/60 pb-3">
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={16} className="text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground tracking-tight">Filtres de Recherche</h3>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={12} /> Réinitialiser
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-lg">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );

  const fields = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Tranche d&apos;âge
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={18}
              max={90}
              value={draft.ageMin ?? 20}
              onChange={(e) => update({ ageMin: Number(e.target.value) })}
              className={inputClass}
            />
            <span className="text-xs text-muted-foreground">à</span>
            <input
              type="number"
              min={18}
              max={90}
              value={draft.ageMax ?? 50}
              onChange={(e) => update({ ageMax: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Pays</label>
          <select value={draft.country ?? ""} onChange={(e) => update({ country: e.target.value || undefined })} className={selectClass}>
            <option value="">Tous les pays</option>
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <AdvancedField isPremium={isPremium} onRequirePremium={onRequirePremium}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Ville</label>
            <input
              placeholder="Ex : Paris, Montréal..."
              value={draft.city ?? ""}
              onChange={(e) => update({ city: e.target.value || undefined })}
              className={inputClass}
            />
          </div>
        </AdvancedField>

        <AdvancedField isPremium={isPremium} onRequirePremium={onRequirePremium}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Confession chrétienne</label>
            <select
              value={draft.denomination ?? ""}
              onChange={(e) => update({ denomination: e.target.value || undefined })}
              className={selectClass}
            >
              <option value="">Toutes confessions</option>
              {DENOMINATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </AdvancedField>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Situation matrimoniale</label>
          <select
            value={draft.maritalStatus ?? ""}
            onChange={(e) => update({ maritalStatus: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Toutes situations</option>
            {MARITAL_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="button" variant="primary" className="w-full h-11" onClick={handleValidate}>
        Valider
      </Button>
    </>
  );

  return (
    <>
      {/* Mobile : feuille glissant depuis le bas (format de l'app native). */}
      <div className="md:hidden fixed inset-0 z-50">
        <div className="absolute inset-0 bg-foreground/45 backdrop-blur-sm" onClick={onClose} />
        <div className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto bg-card rounded-t-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] select-none animate-in slide-in-from-bottom duration-300">
          {header}
          <div className="pt-5 space-y-5">{fields}</div>
        </div>
      </div>

      {/* Desktop : panneau inline inchangé. */}
      <Card variant="base" className="hidden md:block p-5 space-y-5 border-border/60 select-none bg-card">
        {header}
        {fields}
      </Card>
    </>
  );
}
