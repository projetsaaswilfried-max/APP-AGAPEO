"use client";

import { useEffect, useState } from "react";
import { UserProfile, UserFaithProfile, UserPrivacySettings, UserNotificationSettings } from "@/domain/types/user";
import { FeedPublication } from "@/domain/types/feed";
import { updateProfileAction } from "@/lib/actions/profile.actions";
import { feedService } from "@/domain/services/feed.service";

import { ProfileHero } from "@/components/features/profile/profile-hero";
import { FaithSection } from "@/components/features/profile/faith-section";
import { MarriageVisionSection } from "@/components/features/profile/marriage-vision-section";
import { UserPublicationsSection } from "@/components/features/profile/user-publications-section";

import { AccountProfileForm } from "@/components/features/account/account-profile-form";
import { AccountFaithForm } from "@/components/features/account/account-faith-form";
import { AccountMyPosts } from "@/components/features/account/account-my-posts";
import { AccountFavorites } from "@/components/features/account/account-favorites";
import { AccountPrivacySettings } from "@/components/features/account/account-privacy-settings";
import { AccountSecurity } from "@/components/features/account/account-security";
import { AccountPremium } from "@/components/features/account/account-premium";

import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Eye, Settings } from "lucide-react";
import type { ProfilePhotoRow } from "@/lib/supabase/database.types";

interface ProfilePageClientProps {
  initialProfile: UserProfile;
  initialPhotos: ProfilePhotoRow[];
}

export function ProfilePageClient({ initialProfile, initialPhotos }: ProfilePageClientProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [mode, setMode] = useState<"PUBLIC_PREVIEW" | "ACCOUNT_SETTINGS">("ACCOUNT_SETTINGS");
  const [activeTab, setActiveTab] = useState("profile-edit");
  const [personalPosts, setPersonalPosts] = useState<FeedPublication[]>([]);

  useEffect(() => {
    feedService.getPersonalPublications(profile.id).then(setPersonalPosts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updated }));
    await updateProfileAction({
      first_name: updated.firstName,
      last_name: updated.lastName,
      city: updated.city,
      country: updated.country,
      profession: updated.profession,
      education_level: updated.educationLevel,
      bio: updated.bio,
      quote: updated.quote,
      relocation_ready: updated.marriageVision?.relocationReady
    });
  };

  const handleUpdateFaith = async (faith: UserFaithProfile) => {
    setProfile((prev) => ({ ...prev, faith }));
    await updateProfileAction({
      church_denomination: faith.churchDenomination,
      faith_journey_years: faith.faithJourneyYears,
      baptized: faith.baptized,
      faith_description: faith.faithDescription,
      favorite_verse: faith.favoriteVerse || null,
      testimony: faith.testimony || null,
      current_god_action: faith.currentGodAction || null
    });
  };

  const handleUpdatePrivacyAndNotifications = async (privacy: UserPrivacySettings, notifications: UserNotificationSettings) => {
    setProfile((prev) => ({ ...prev, privacySettings: privacy, notificationSettings: notifications }));
    await updateProfileAction({
      show_online_status: privacy.showOnlineStatus,
      show_read_receipts: privacy.showReadReceipts,
      allow_profile_visits: privacy.allowProfileVisits,
      is_invisible_profile: privacy.isInvisibleProfile,
      is_photo_blurred: privacy.isPhotoBlurred,
      notify_messages: notifications.notifyMessages,
      notify_favorites: notifications.notifyFavorites,
      notify_recommendations: notifications.notifyRecommendations,
      notify_official_posts: notifications.notifyOfficialPosts,
      notify_comments: notifications.notifyComments,
      notify_likes: notifications.notifyLikes,
      notify_email_digest: notifications.notifyEmailDigest
    });
  };

  return (
    <div className="space-y-6 w-full pb-16 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">
            {mode === "ACCOUNT_SETTINGS" ? "Espace Personnel & Réglages" : "Aperçu de mon Profil Public"}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Gère tes informations, ton identité de foi, ta vision du mariage et tes paramètres de confidentialité.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setMode(mode === "ACCOUNT_SETTINGS" ? "PUBLIC_PREVIEW" : "ACCOUNT_SETTINGS")}
          leftIcon={mode === "ACCOUNT_SETTINGS" ? <Eye size={15} /> : <Settings size={15} />}
          className="shrink-0"
        >
          {mode === "ACCOUNT_SETTINGS" ? "Voir mon profil public" : "Gérer mon compte"}
        </Button>
      </div>

      {mode === "ACCOUNT_SETTINGS" && (
        <div className="space-y-6">
          <div className="overflow-x-auto pb-1 no-scrollbar">
            <Tabs
              variant="pill"
              tabs={[
                { id: "profile-edit", label: "Mon Profil" },
                { id: "faith-edit", label: "Ma Foi" },
                { id: "my-posts", label: "Mes Publications", count: personalPosts.length },
                { id: "favorites", label: "Mes Favoris" },
                { id: "privacy", label: "Confidentialité" },
                { id: "premium", label: "Premium" },
                { id: "account", label: "Mon Compte & Sécurité" }
              ]}
              activeTabId={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {activeTab === "profile-edit" && (
            <AccountProfileForm profile={profile} initialPhotos={initialPhotos} onSave={handleUpdateProfile} />
          )}
          {activeTab === "faith-edit" && <AccountFaithForm faith={profile.faith} onSave={handleUpdateFaith} />}
          {activeTab === "my-posts" && <AccountMyPosts publications={personalPosts} />}
          {activeTab === "favorites" && <AccountFavorites />}
          {activeTab === "privacy" && (
            <AccountPrivacySettings
              privacy={profile.privacySettings}
              notifications={profile.notificationSettings}
              onSave={handleUpdatePrivacyAndNotifications}
            />
          )}
          {activeTab === "premium" && <AccountPremium profile={profile} />}
          {activeTab === "account" && <AccountSecurity profile={profile} />}
        </div>
      )}

      {mode === "PUBLIC_PREVIEW" && (
        <div className="space-y-6">
          <ProfileHero profile={profile} isFavorite={false} onToggleFavorite={() => {}} onSendMessage={() => {}} isOwnProfile />
          <FaithSection faith={profile.faith} />
          <MarriageVisionSection marriageVision={profile.marriageVision} aboutMe={profile.aboutMe} preferences={profile.preferences} />
          <UserPublicationsSection userName={profile.firstName} publications={personalPosts} isOwner />
        </div>
      )}
    </div>
  );
}
