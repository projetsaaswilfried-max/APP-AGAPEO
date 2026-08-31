"use client";

import React, { useState } from "react";
import { UserProfile } from "@/domain/types/user";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaGallery } from "@/components/ui/media-gallery";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Languages,
  Bookmark,
  MessageSquare,
  Calendar,
  Users,
  Ruler
} from "lucide-react";
import { MARITAL_STATUS_LABELS } from "@/domain/marital-status";
import { cn } from "@/lib/utils";

interface ProfileHeroProps {
  profile: UserProfile;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSendMessage: () => void;
  isOwnProfile?: boolean;
}

export function ProfileHero({
  profile,
  isFavorite,
  onToggleFavorite,
  onSendMessage,
  isOwnProfile = false
}: ProfileHeroProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="bg-card border border-border/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-soft select-none">
      {/* Container Haut : Avatar + Infos Majeures + CTAs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-border/40 pb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-5 text-center sm:text-left w-full md:w-auto">
          {/* Avatar XL avec Badge d'Authenticité — cliquable pour l'agrandir */}
          <button
            type="button"
            onClick={() => profile.avatarUrl && setLightboxUrl(profile.avatarUrl)}
            className="shrink-0 rounded-full cursor-pointer"
            title="Agrandir la photo"
          >
            <Avatar
              size="xl"
              src={profile.avatarUrl}
              fallback={profile.firstName.charAt(0)}
              isVerified={profile.badges.some((b) => b.code === "VERIFIED_FAITH")}
              className="ring-4 ring-background shadow-md"
            />
          </button>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-foreground">
                {profile.firstName} {profile.lastName}, {profile.age} ans
              </h1>
            </div>

            <p className="text-sm font-medium text-foreground/80 flex items-center justify-center sm:justify-start gap-1.5">
              <Briefcase size={14} className="text-muted-foreground" /> {profile.profession}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {profile.city}, {profile.country}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <GraduationCap size={13} /> {profile.educationLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Boutons d'Action */}
        {!isOwnProfile && (
          <div className="flex flex-col sm:flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto shrink-0">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                size="md"
                onClick={onToggleFavorite}
                leftIcon={
                  <Bookmark
                    size={16}
                    className={cn(isFavorite && "fill-current text-accent")}
                  />
                }
                className="flex-1 sm:flex-none"
              >
                {isFavorite ? "Enregistré" : "Favoris"}
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={onSendMessage}
                leftIcon={<MessageSquare size={16} />}
                className="flex-1 sm:flex-none"
              >
                Envoyer un message
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Présentation Bio & Citation */}
      <div className="space-y-3">
        {profile.quote && (
          <p className="text-sm font-display italic text-foreground/90 bg-secondary/50 border-l-2 border-accent p-3.5 rounded-r-xl">
            &ldquo;{profile.quote}&rdquo;
          </p>
        )}
        <p className="text-sm text-foreground/90 leading-relaxed">
          {profile.bio}
        </p>
      </div>

      {/* Badges d'Informations Rapides */}
      <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
        {profile.maritalStatus && (
          <Badge variant="status">
            <Users size={12} className="mr-1" /> {MARITAL_STATUS_LABELS[profile.maritalStatus]}
          </Badge>
        )}
        {profile.heightCm && (
          <Badge variant="status">
            <Ruler size={12} className="mr-1" /> {profile.heightCm} cm
          </Badge>
        )}
        <Badge variant="status">
          <Languages size={12} className="mr-1" /> {profile.languages.join(", ")}
        </Badge>
        <Badge variant="status">
          <Calendar size={12} className="mr-1" /> Membre depuis Février 2026
        </Badge>
        <Badge variant={profile.status === "AVAILABLE" ? "status" : "verified"}>
          {profile.statusLabel}
        </Badge>
      </div>

      {/* Aperçu Galerie Photos */}
      {profile.photos && profile.photos.length > 0 && (
        <div className="pt-4 border-t border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Galerie Photos ({profile.photos.length})
            </h3>
            <button
              onClick={() => setShowGallery(!showGallery)}
              className="text-xs text-primary hover:underline font-medium"
            >
              {showGallery ? "Masquer la galerie" : "Afficher les photos"}
            </button>
          </div>
          {showGallery && <MediaGallery photos={profile.photos} onPhotoClick={(photo) => setLightboxUrl(photo.url)} />}
        </div>
      )}

      <ImageLightbox src={lightboxUrl} alt={`Photo de ${profile.firstName}`} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
