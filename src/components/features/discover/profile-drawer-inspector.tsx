"use client";

import { useState, useEffect } from "react";
import { RecommendedProfileItem } from "@/domain/types/discover";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { VerifiedMemberBadge } from "@/components/ui/verified-member-badge";
import { MediaGallery } from "@/components/ui/media-gallery";
import { ReportModal } from "@/components/features/moderation/report-modal";
import { createClient } from "@/lib/supabase/client";
import { Heart, MessageSquare, Church, MapPin, CheckCircle2, Bookmark, Flag } from "lucide-react";

interface ProfileDrawerInspectorProps {
  item: RecommendedProfileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onSendMessage: (profileId: string) => void;
  /** Appelé (et le drawer refermé) si la limite mensuelle de consultation gratuite est atteinte. */
  onViewLimitReached?: () => void;
}

export function ProfileDrawerInspector({
  item,
  isOpen,
  onClose,
  onToggleFavorite,
  onSendMessage,
  onViewLimitReached
}: ProfileDrawerInspectorProps) {
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;
    const supabase = createClient();
    supabase.rpc("record_profile_view", { viewed_profile_id: item.profile.id }).then(({ error }) => {
      if (error?.message?.includes("MONTHLY_VIEW_LIMIT_REACHED")) {
        onClose();
        onViewLimitReached?.();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.profile.id]);

  if (!item) return null;

  const { profile, justifications, isFavorite } = item;
  const isVerified = profile.badges.some((b) => b.code === "VERIFIED_FAITH");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${profile.firstName}, ${profile.age} ans`}
      description={`${profile.city}, ${profile.country} — ${profile.profession}`}
      maxWidth="lg"
      footer={
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsReportOpen(true)}
            leftIcon={<Flag size={14} />}
            className="text-muted-foreground order-first basis-full sm:basis-auto sm:mr-auto justify-start sm:justify-center"
          >
            Signaler
          </Button>
          <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleFavorite(profile.id)}
              leftIcon={<Bookmark size={15} className={isFavorite ? "fill-current text-accent" : ""} />}
            >
              {isFavorite ? "Enregistré" : "Favoris"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onSendMessage(profile.id);
                onClose();
              }}
              leftIcon={<MessageSquare size={15} />}
            >
              Envoyer un message
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 select-none text-foreground">
        {/* En-tête du profil avec photo principale */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-secondary/40 border border-border/40">
          <Avatar
            size="xl"
            src={profile.avatarUrl}
            fallback={profile.firstName.charAt(0)}
          />
          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg font-display font-semibold tracking-tight">
                {profile.firstName} {profile.lastName}
              </h2>
              {isVerified && <VerifiedMemberBadge size="sm" />}
            </div>
            <p className="text-xs font-medium text-muted-foreground">{profile.profession}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground pt-1">
              <MapPin size={13} /> {profile.city}, {profile.country}
            </div>
          </div>
        </div>

        {/* Pourquoi cette recommandation ? */}
        <div className="p-4 rounded-2xl bg-accent-subtle/60 border border-accent/20 space-y-2">
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Heart size={13} className="text-accent" /> Pourquoi cette recommandation ?
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            {justifications.map((j, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>{j}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Présentation / Bio */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Présentation & Démarche
          </h4>
          <p className="text-sm text-foreground/90 leading-relaxed bg-card p-4 rounded-2xl border border-border/60">
            {profile.bio}
          </p>
        </div>

        {/* Parcours de Foi & Communauté */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Church size={14} className="text-primary" /> Engagement Spirituel & Foi
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Dénomination</span>
              <span className="font-medium">{profile.faith.churchDenomination}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Baptême</span>
              <span className="font-medium">{profile.faith.baptized ? "Baptisé(e) par immersion" : "Non baptisé"}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground block text-[11px]">Implication communautaire</span>
              <span className="font-medium">{profile.faith.faithDescription}</span>
            </div>
          </div>
        </div>

        {/* Vision du Mariage & Valeurs */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Heart size={14} className="text-accent" /> Vision du Foyer & Mariage
          </h4>
          <p className="text-xs text-foreground/90 leading-relaxed italic">
            &ldquo;{profile.marriageVision.familyVision}&rdquo;
          </p>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {profile.marriageVision.coreValues.map((val, idx) => (
              <Badge key={idx} variant="status" className="text-xs">
                {val}
              </Badge>
            ))}
          </div>
        </div>

        {/* Galerie Photos du membre */}
        {profile.photos && profile.photos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Photos du membre
            </h4>
            <MediaGallery photos={profile.photos} />
          </div>
        )}
      </div>

      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} targetType="PROFILE" targetId={profile.id} />
    </Modal>
  );
}
