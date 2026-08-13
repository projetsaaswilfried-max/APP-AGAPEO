"use client";

import React from "react";
import { UserFaithProfile } from "@/domain/types/user";
import { Card } from "@/components/ui/card";
import { Church, BookOpen, HeartHandshake, Flame, Quote } from "lucide-react";

interface FaithSectionProps {
  faith: UserFaithProfile;
}

export function FaithSection({ faith }: FaithSectionProps) {
  return (
    <Card variant="base" className="p-6 space-y-6 select-none border-border/60 shadow-2xs">
      <div className="flex items-center gap-2 border-b border-border/60 pb-4">
        <Church className="h-5 w-5 text-primary shrink-0" />
        <div>
          <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
            Ma Foi & Mon Parcours Spirituel
          </h2>
          <p className="text-xs text-muted-foreground">
            Identity spirituelle, communauté locale et expérience personnelle avec Dieu.
          </p>
        </div>
      </div>

      {/* Grille d'informations clés */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Dénomination
          </span>
          <span className="text-sm font-semibold text-foreground">
            {faith.churchDenomination}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Parcours spirituel
          </span>
          <span className="text-sm font-semibold text-foreground">
            Chrétienne depuis {faith.faithJourneyYears} ans
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-secondary/40 border border-border/40 space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Baptême
          </span>
          <span className="text-sm font-semibold text-foreground">
            {faith.baptized ? "Baptisée par immersion" : "Non baptisée"}
          </span>
        </div>
      </div>

      {/* Implication Communautaire */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <HeartHandshake size={14} className="text-accent" /> Ministère & Implication Locale
        </h3>
        <p className="text-sm text-foreground/90 leading-relaxed bg-card p-4 rounded-2xl border border-border/60">
          {faith.faithDescription} ({faith.communityEngagement})
        </p>
      </div>

      {/* Verset Préféré */}
      {faith.favoriteVerse && (
        <div className="p-5 rounded-2xl bg-secondary/50 border border-border/60 relative space-y-2">
          <Quote size={24} className="text-accent/60" />
          <p className="font-display text-sm md:text-base italic text-foreground leading-relaxed">
            {faith.favoriteVerse}
          </p>
        </div>
      )}

      {/* Témoignage Personnel */}
      {faith.testimony && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen size={14} className="text-primary" /> Témoignage Personnel
          </h3>
          <p className="text-sm text-foreground/90 leading-relaxed bg-card p-4 rounded-2xl border border-border/60">
            {faith.testimony}
          </p>
        </div>
      )}

      {/* Ce que Dieu fait actuellement */}
      {faith.currentGodAction && (
        <div className="p-4 rounded-2xl bg-accent-subtle/60 border border-accent/20 space-y-1.5">
          <h3 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Flame size={13} className="text-accent" /> Ce que Dieu fait actuellement dans sa vie
          </h3>
          <p className="text-xs text-foreground/90 leading-relaxed italic">
            &ldquo;{faith.currentGodAction}&rdquo;
          </p>
        </div>
      )}
    </Card>
  );
}
