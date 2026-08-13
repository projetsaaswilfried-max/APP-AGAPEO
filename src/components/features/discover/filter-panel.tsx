"use client";

import React from "react";
import { DiscoverFilterCriteria } from "@/domain/types/discover";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SUPPORTED_COUNTRIES } from "@/config/countries";
import { FAITH_ENGAGEMENT_LEVELS } from "@/config/faith-options";
import { SlidersHorizontal, RefreshCw, X } from "lucide-react";

interface FilterPanelProps {
  filters: DiscoverFilterCriteria;
  onChangeFilters: (filters: DiscoverFilterCriteria) => void;
  onResetFilters: () => void;
  onClose?: () => void;
}

const selectClass =
  "w-full h-9 rounded-xl border border-border/60 bg-secondary/40 px-3 text-xs text-foreground focus:outline-none cursor-pointer";
const inputClass = "w-full h-9 rounded-xl border border-border/60 bg-secondary/40 px-3 text-xs text-foreground focus:outline-none";

export function FilterPanel({ filters, onChangeFilters, onResetFilters, onClose }: FilterPanelProps) {
  const update = (patch: Partial<DiscoverFilterCriteria>) => onChangeFilters({ ...filters, ...patch });

  return (
    <Card variant="base" className="p-5 space-y-5 border-border/60 shadow-2xs select-none bg-card">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-primary" />
          <h3 className="text-sm font-display font-semibold text-foreground tracking-tight">
            Filtres de Recherche Avancés
          </h3>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Tranche d&apos;âge ({filters.ageMin ?? 20} - {filters.ageMax ?? 50} ans)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={18}
              max={90}
              value={filters.ageMin ?? 20}
              onChange={(e) => update({ ageMin: Number(e.target.value) })}
              className={inputClass}
            />
            <span className="text-xs text-muted-foreground">à</span>
            <input
              type="number"
              min={18}
              max={90}
              value={filters.ageMax ?? 50}
              onChange={(e) => update({ ageMax: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Pays</label>
          <select value={filters.country ?? ""} onChange={(e) => update({ country: e.target.value || undefined })} className={selectClass}>
            <option value="">Tous les pays</option>
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Ville</label>
          <input
            placeholder="Ex : Paris, Montréal..."
            value={filters.city ?? ""}
            onChange={(e) => update({ city: e.target.value || undefined })}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Confession chrétienne</label>
          <input
            placeholder="Ex : Évangélique, Catholique..."
            value={filters.denomination ?? ""}
            onChange={(e) => update({ denomination: e.target.value || undefined })}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Engagement dans la foi</label>
          <select
            value={filters.faithEngagementLevel ?? ""}
            onChange={(e) => update({ faithEngagementLevel: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Tous niveaux</option>
            {FAITH_ENGAGEMENT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Profession</label>
          <input
            placeholder="Ex : Infirmier(ère), Ingénieur..."
            value={filters.profession ?? ""}
            onChange={(e) => update({ profession: e.target.value || undefined })}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Centre d&apos;intérêt</label>
          <input
            placeholder="Ex : Musique, Voyage..."
            value={filters.passion ?? ""}
            onChange={(e) => update({ passion: e.target.value || undefined })}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Statut</label>
          <select value={filters.status ?? "ALL"} onChange={(e) => update({ status: e.target.value })} className={selectClass}>
            <option value="ALL">Tous les statuts</option>
            <option value="AVAILABLE">Disponible uniquement</option>
            <option value="IN_DISCUSSION">En discussion</option>
          </select>
        </div>
      </div>

      <div className="pt-2 border-t border-border/40 flex flex-wrap gap-x-8 gap-y-3">
        <Checkbox
          checked={filters.verifiedOnly ?? false}
          onCheckedChange={(checked) => update({ verifiedOnly: checked })}
          label="Photo vérifiée uniquement"
        />
        <Checkbox
          checked={filters.relocationReady ?? false}
          onCheckedChange={(checked) => update({ relocationReady: checked || undefined })}
          label="Disponible à déménager"
        />
        <Checkbox
          checked={filters.wantsChildren ?? false}
          onCheckedChange={(checked) => update({ wantsChildren: checked || undefined })}
          label="Souhaite des enfants"
        />
      </div>
    </Card>
  );
}
