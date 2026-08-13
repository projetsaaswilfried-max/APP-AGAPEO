"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/domain/types/user";
import type { FeedPublication } from "@/domain/types/feed";
import { createClient } from "@/lib/supabase/client";
import { discoverService } from "@/domain/services/discover.service";
import { messageService } from "@/domain/services/message.service";
import { ProfileHero } from "@/components/features/profile/profile-hero";
import { CompatibilityExplainedSection } from "@/components/features/profile/compatibility-explained-section";
import { FaithSection } from "@/components/features/profile/faith-section";
import { MarriageVisionSection } from "@/components/features/profile/marriage-vision-section";
import { UserPublicationsSection } from "@/components/features/profile/user-publications-section";
import { ReportModal } from "@/components/features/moderation/report-modal";
import { BlockConfirmModal } from "@/components/features/moderation/block-confirm-modal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flag, Ban } from "lucide-react";

interface PublicProfileClientProps {
  profile: UserProfile;
  personalPublications: FeedPublication[];
  compatibilityPercentage: number;
  compatibilityReasons: string[];
  isFavorite: boolean;
}

export function PublicProfileClient({
  profile,
  personalPublications,
  compatibilityPercentage,
  compatibilityReasons,
  isFavorite: initialIsFavorite
}: PublicProfileClientProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.rpc("record_profile_view", { viewed_profile_id: profile.id });
  }, [profile.id]);

  const handleToggleFavorite = async () => {
    setIsFavorite((prev) => !prev);
    try {
      await discoverService.toggleFavorite(profile.id);
    } catch {
      setIsFavorite((prev) => !prev);
    }
  };

  const handleSendMessage = async () => {
    try {
      const conversationId = await messageService.getOrCreateConversation(profile.id);
      router.push(`/messages?conversation=${conversationId}`);
    } catch (err) {
      console.error(err);
    }
  };

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

      <ProfileHero profile={profile} isFavorite={isFavorite} onToggleFavorite={handleToggleFavorite} onSendMessage={handleSendMessage} />
      <CompatibilityExplainedSection percentage={compatibilityPercentage} reasons={compatibilityReasons} />
      <FaithSection faith={profile.faith} />
      <MarriageVisionSection marriageVision={profile.marriageVision} aboutMe={profile.aboutMe} preferences={profile.preferences} />
      <UserPublicationsSection userName={profile.firstName} publications={personalPublications} isOwner={false} />

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
    </div>
  );
}
