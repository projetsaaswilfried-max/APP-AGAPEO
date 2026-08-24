"use client";

import { RecommendedProfileItem } from "@/domain/types/discover";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Bookmark, Heart, MapPin, MessageSquare, Lock } from "lucide-react";
import { cn, maskForPreview } from "@/lib/utils";

interface DiscoverProfileCardProps {
  item: RecommendedProfileItem;
  /** Faux pour un membre qui n'a pas encore fait valider son profil : aperçu seul, aucune interaction réelle. */
  canInteract: boolean;
  onInspectProfile: (item: RecommendedProfileItem) => void;
  onToggleFavorite: (id: string) => void;
  onSendMessage: (profileId: string) => void;
  onRequireVerification: (reason: string) => void;
}

export function DiscoverProfileCard({
  item,
  canInteract,
  onInspectProfile,
  onToggleFavorite,
  onSendMessage,
  onRequireVerification
}: DiscoverProfileCardProps) {
  const { profile, compatibilityPercentage, isFavorite } = item;
  // La photo reste nette pour tout le monde (seul le choix de flou du membre
  // lui-même s'applique) — c'est le nom/l'âge/la localisation qui sont
  // masqués tant que le visiteur n'a pas fait valider son propre profil.
  const isBlurred = profile.privacySettings?.isPhotoBlurred;
  const displayName = canInteract ? profile.firstName : maskForPreview(profile.firstName, 2);
  const displayAge = canInteract ? String(profile.age) : maskForPreview(String(profile.age));
  const displayCity = canInteract ? profile.city : maskForPreview(profile.city);
  const displayCountry = canInteract ? profile.country : maskForPreview(profile.country);

  const handleInspect = () => (canInteract ? onInspectProfile(item) : onRequireVerification("consulter ce profil"));
  const handleFavorite = () => (canInteract ? onToggleFavorite(profile.id) : onRequireVerification("mettre ce membre en favori"));
  const handleMessage = () => (canInteract ? onSendMessage(profile.id) : onRequireVerification("contacter ce membre"));

  return (
    <Card variant="interactive" className="p-5 flex flex-col justify-between h-full select-none group border-border/60 shadow-2xs">
      <div className="space-y-4" onClick={handleInspect}>
        <div className="flex items-start justify-between gap-3">
          <div className="relative shrink-0">
            <div className="relative">
              <Avatar
                size="xl"
                src={profile.avatarUrl}
                fallback={profile.firstName.charAt(0)}
                isVerified={profile.badges.some((b) => b.code === "VERIFIED_FAITH")}
                className={cn("ring-2 ring-primary/20 shadow-md transition-all", isBlurred && "blur-md scale-105")}
              />
              {isBlurred && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                  <span title="Photo floutée par le membre" className="inline-flex">
                    <Lock size={16} className="text-white" />
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge variant="premium" className="text-xs px-2.5 py-0.5 shadow-2xs">
              <Heart size={11} className="mr-1 text-accent fill-accent" /> {compatibilityPercentage}%
            </Badge>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFavorite();
              }}
              className={cn(
                "p-2 rounded-full border transition-all shadow-2xs",
                isFavorite
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card text-muted-foreground border-border/60 hover:bg-secondary hover:text-foreground"
              )}
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Bookmark size={15} className={cn(isFavorite && "fill-current")} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-display font-semibold tracking-tight text-foreground">
              {displayName}, {displayAge} ans
            </h3>
          </div>

          <p className="text-xs font-medium text-muted-foreground truncate">{profile.profession}</p>

          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
            <MapPin size={12} className="shrink-0 text-primary" />
            <span className="truncate">
              {displayCity ? `${displayCity}, ` : ""}
              {displayCountry}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-secondary/50 border border-border/40 space-y-1">
          <p className="text-xs text-foreground/90 italic font-normal leading-relaxed line-clamp-3">
            &ldquo;{profile.quote || profile.bio || "Ce membre n'a pas encore rédigé de présentation."}&rdquo;
          </p>
        </div>

        {item.justifications.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">Points forts :</span>
            <div className="flex flex-wrap gap-1">
              {item.justifications.slice(0, 2).map((just, idx) => (
                <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-card border border-border/60 text-foreground/80">
                  ✓ {just}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 items-stretch">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleInspect();
          }}
          className="h-auto min-h-9 py-2 text-xs whitespace-normal leading-snug text-center"
        >
          Voir le profil
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleMessage();
          }}
          leftIcon={<MessageSquare size={13} className="shrink-0" />}
          className="h-auto min-h-9 py-2 text-xs whitespace-normal leading-snug text-center"
        >
          Envoyer un message
        </Button>
      </div>
    </Card>
  );
}
