"use client";

import React from "react";
import { UserMarriageVision, UserAboutMe, UserPartnerPreferences } from "@/domain/types/user";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Compass, Smile } from "lucide-react";

interface MarriageVisionSectionProps {
  marriageVision: UserMarriageVision;
  aboutMe: UserAboutMe;
  preferences: UserPartnerPreferences;
}

export function MarriageVisionSection({
  marriageVision,
  aboutMe,
  preferences
}: MarriageVisionSectionProps) {
  return (
    <div className="space-y-6 select-none">
      {/* SECTION 5: Vision du Mariage */}
      <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-border/60 pb-4">
          <Heart className="h-5 w-5 text-accent shrink-0" />
          <div>
            <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
              Vision du Foyer & du Mariage
            </h2>
            <p className="text-xs text-muted-foreground">
              Objectifs d&apos;engagement, vision du couple et projet de famille.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pourquoi je recherche le mariage ?
            </h3>
            <p className="text-sm text-foreground/90 leading-relaxed bg-card p-4 rounded-2xl border border-border/60">
              {marriageVision.whyMarriage}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Vision des enfants
              </span>
              <span className="text-sm font-semibold text-foreground">
                Souhaite {marriageVision.desiredChildrenCount}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Mobilité géographique
              </span>
              <span className="text-sm font-semibold text-foreground">
                {marriageVision.relocationReady ? "Disponible à déménager" : "Souhaite rester dans sa région"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Valeurs piliers du foyer
            </h3>
            <div className="flex flex-wrap gap-2">
              {marriageVision.coreValues.map((val, idx) => (
                <Badge key={idx} variant="status" className="text-xs px-3 py-1">
                  ✦ {val}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 4: À Propos de Moi (Personnalité & Passions) */}
      <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-border/60 pb-4">
          <Smile className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
              Personnalité, Passions & Centre d&apos;Intérêts
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Traits de personnalité & Qualités
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {aboutMe.personalityTraits.concat(aboutMe.qualities).map((trait, idx) => (
                <Badge key={idx} variant="verified" className="text-xs">
                  {trait}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Passions & Loisirs
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {aboutMe.passions.concat(aboutMe.hobbies).map((hobby, idx) => (
                <Badge key={idx} variant="status" className="text-xs">
                  {hobby}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 6: Ce que je recherche */}
      <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-border/60 pb-4">
          <Compass className="h-5 w-5 text-accent shrink-0" />
          <div>
            <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
              Ce que je recherche chez mon partenaire
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Tranche d&apos;âge recherchée
            </span>
            <span className="text-sm font-semibold text-foreground">
              {preferences.desiredAgeMin} à {preferences.desiredAgeMax} ans
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Pays recherchés
            </span>
            <span className="text-sm font-semibold text-foreground">
              {preferences.desiredCountries.join(", ")}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Valeurs clés recherchées
          </h3>
          <div className="flex flex-wrap gap-2">
            {preferences.desiredValues.map((val, idx) => (
              <Badge key={idx} variant="premium" className="text-xs">
                {val}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
