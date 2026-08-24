"use client";

import { RecommendedProfileItem } from "@/domain/types/discover";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompatibilityCardProps {
  item: RecommendedProfileItem;
  /** Faux pour un membre qui n'a pas encore fait valider son profil : aperçu seul, aucune interaction réelle. */
  canInteract: boolean;
  onInspectProfile: (item: RecommendedProfileItem) => void;
  onRequireVerification: (reason: string) => void;
}

export function CompatibilityCard({
  item,
  canInteract,
  onInspectProfile,
  onRequireVerification
}: CompatibilityCardProps) {
  const { profile, compatibilityPercentage, justifications } = item;
  const isBlurred = profile.privacySettings?.isPhotoBlurred || !canInteract;
  const handleInspect = () => (canInteract ? onInspectProfile(item) : onRequireVerification("consulter ce profil"));

  return (
    <Card variant="interactive" className="p-5 overflow-hidden relative border-accent/20 bg-gradient-to-br from-card via-card to-accent-subtle/50 select-none shadow-soft">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
        {/* Photo de profil (ronde, cohérente avec le reste de la plateforme) */}
        <div className="relative w-32 h-32 md:w-36 md:h-36 mx-auto md:mx-0 shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden bg-secondary border border-border/50 shadow-xs">
            <img
              src={profile.avatarUrl}
              alt={profile.firstName}
              className={cn("w-full h-full object-cover", isBlurred && "blur-md scale-105")}
            />
          </div>
          {isBlurred && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
              <span title={canInteract ? "Photo floutée par le membre" : "Valide ton profil pour voir les photos nettement"} className="inline-flex">
                <Lock size={20} className="text-white" />
              </span>
            </div>
          )}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0">
            <Badge variant="premium" className="text-[10px] px-2.5 py-0.5 shadow-2xs whitespace-nowrap">
              <Heart size={11} className="mr-1 text-primary fill-primary" /> {compatibilityPercentage}%
            </Badge>
          </div>
        </div>

        {/* Détails & Compatibilité Expliquée (Fonctionnalité Signature) */}
        <div className="flex-1 space-y-3 text-center md:text-left w-full">
          <div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-0.5">
              <h3 className="text-base font-display font-semibold text-foreground tracking-tight">
                {profile.firstName}, {profile.age} ans
              </h3>
              <span className="text-xs text-muted-foreground">• {profile.city}, {profile.country}</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">{profile.profession}</p>
          </div>

          {/* Explication de la compatibilité */}
          <div className="p-3 rounded-2xl bg-accent-subtle/60 border border-accent/15 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground flex items-center gap-1">
              <Heart size={12} className="text-primary fill-primary" /> Pourquoi cette recommandation ?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {justifications.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-foreground/90 min-w-0">
                  <CheckCircle2 size={13} className="text-primary shrink-0" />
                  <span className="truncate min-w-0">{reason}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {profile.quote && (
              <p className="text-xs italic text-muted-foreground truncate max-w-sm hidden lg:block">
                &ldquo;{profile.quote}&rdquo;
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleInspect}
              rightIcon={<ArrowRight size={14} />}
              className="ml-auto"
            >
              Consulter la fiche
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
