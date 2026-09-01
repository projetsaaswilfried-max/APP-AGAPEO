"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/domain/types/user";
import type { FeedPublication } from "@/domain/types/feed";
import { createClient } from "@/lib/supabase/client";
import { discoverService } from "@/domain/services/discover.service";
import { PremiumRequiredError } from "@/domain/errors";
import { ProfileHero } from "@/components/features/profile/profile-hero";
import { CompatibilityExplainedSection } from "@/components/features/profile/compatibility-explained-section";
import { FaithSection } from "@/components/features/profile/faith-section";
import { MarriageVisionSection } from "@/components/features/profile/marriage-vision-section";
import { UserPublicationsSection } from "@/components/features/profile/user-publications-section";
import { ReportModal } from "@/components/features/moderation/report-modal";
import { BlockConfirmModal } from "@/components/features/moderation/block-confirm-modal";
import { PremiumRequiredModal } from "@/components/features/premium/premium-required-modal";
import { SendInvitationModal } from "@/components/features/messages/send-invitation-modal";
import { useSendInvitation } from "@/core/hooks/use-send-invitation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flag, Ban } from "lucide-react";

interface PublicProfileClientProps {
  profile: UserProfile;
  personalPublications: FeedPublication[];
  compatibilityReasons: string[];
  isFavorite: boolean;
  isLiked: boolean;
}

export function PublicProfileClient({
  profile,
  personalPublications,
  compatibilityReasons,
  isFavorite: initialIsFavorite,
  isLiked: initialIsLiked
}: PublicProfileClientProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPremiumRequiredOpen, setIsPremiumRequiredOpen] = useState(false);
  const [premiumReason, setPremiumReason] = useState("contacter ce membre en premier");

  useEffect(() => {
    const supabase = createClient();
    void supabase.rpc("record_profile_view", { viewed_profile_id: profile.id });
  }, [profile.id]);

  const handleToggleFavorite = async () => {
    setIsFavorite((prev) => !prev);
    try {
      await discoverService.toggleFavorite(profile.id);
    } catch (err) {
      setIsFavorite((prev) => !prev);
      if (err instanceof PremiumRequiredError) {
        setPremiumReason("mettre des profils en favori");
        setIsPremiumRequiredOpen(true);
      }
    }
  };

  // Cette page n'est jamais atteignable sans être VERIFIED (cf. garde côté
  // page.tsx) — VerificationRequiredError ne peut donc jamais survenir ici en pratique.
  const handleToggleLike = async () => {
    setIsLiked((prev) => !prev);
    try {
      await discoverService.toggleLike(profile.id);
    } catch (err) {
      setIsLiked((prev) => !prev);
      console.error(err);
    }
  };

  const { pendingTarget: pendingInvitation, isSending: isSendingInvitation, requestSend: requestInvitation, cancel: cancelInvitation, confirmSend: confirmInvitation } = useSendInvitation({
    onSuccess: (conversationId) => router.push(`/messages?conversation=${conversationId}`),
    onPremiumRequired: () => {
      setPremiumReason("contacter ce membre en premier");
      setIsPremiumRequiredOpen(true);
    },
    onError: (message) => console.error(message)
  });

  const handleSendMessage = () => requestInvitation(profile.id, profile.firstName);

  if (isBlocked) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Vous avez bloqué {profile.firstName}. Ce profil n&apos;est plus accessible.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/discover")}>
          Retour à Découvrir
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-16 select-none">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} /> Retour
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsReportOpen(true)} leftIcon={<Flag size={13} />} className="text-muted-foreground">
            Signaler
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsBlockOpen(true)}
            leftIcon={<Ban size={13} />}
            className="text-destructive hover:bg-destructive/10"
          >
            Bloquer
          </Button>
        </div>
      </div>

      <ProfileHero
        profile={profile}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        isLiked={isLiked}
        onToggleLike={handleToggleLike}
        onSendMessage={handleSendMessage}
      />
      <CompatibilityExplainedSection reasons={compatibilityReasons} />
      <FaithSection faith={profile.faith} />
      <MarriageVisionSection marriageVision={profile.marriageVision} aboutMe={profile.aboutMe} preferences={profile.preferences} />
      <UserPublicationsSection userName={profile.firstName} profileId={profile.id} publications={personalPublications} isOwner={false} />

      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} targetType="PROFILE" targetId={profile.id} />
      <BlockConfirmModal
        isOpen={isBlockOpen}
        onClose={() => setIsBlockOpen(false)}
        blockedProfileId={profile.id}
        blockedProfileName={profile.firstName}
        onBlocked={() => {
          setIsBlockOpen(false);
          setIsBlocked(true);
        }}
      />
      <PremiumRequiredModal isOpen={isPremiumRequiredOpen} onClose={() => setIsPremiumRequiredOpen(false)} reason={premiumReason} />
      <SendInvitationModal
        isOpen={!!pendingInvitation}
        onClose={cancelInvitation}
        onConfirm={confirmInvitation}
        firstName={pendingInvitation?.firstName ?? ""}
        isSending={isSendingInvitation}
      />
    </div>
  );
}
