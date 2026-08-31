"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Heart, CheckCircle2 } from "lucide-react";

interface CompatibilityExplainedSectionProps {
  reasons: string[];
}

export function CompatibilityExplainedSection({
  reasons
}: CompatibilityExplainedSectionProps) {
  return (
    <Card variant="base" className="p-6 space-y-6 border-accent/30 bg-gradient-to-br from-card via-card to-amber-500/5 select-none shadow-2xs">
      <div className="flex items-center gap-2 border-b border-border/60 pb-4">
        <Heart className="h-5 w-5 text-accent shrink-0" />
        <div>
          <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
            Compatibilité Expliquée • Fonctionnalité Signature
          </h2>
          <p className="text-xs text-muted-foreground">
            Analyse automatique basée sur les valeurs, la foi et le projet de vie.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reasons.map((reason, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border/60 shadow-2xs"
          >
            <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-600 shrink-0 mt-0.5">
              <CheckCircle2 size={16} />
            </div>
            <p className="text-xs font-medium text-foreground leading-relaxed">
              {reason}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
