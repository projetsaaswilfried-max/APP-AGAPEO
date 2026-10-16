"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { AccountAdditionalInfoForm, type AdditionalInfoUpdate } from "@/components/features/account/account-additional-info-form";
import { AccountMyPosts } from "@/components/features/account/account-my-posts";
import { AccountFavorites } from "@/components/features/account/account-favorites";
import { AccountWhoLikesMe } from "@/components/features/account/account-who-likes-me";
import { AccountPrivacySettings } from "@/components/features/account/account-privacy-settings";
import { AccountSecurity } from "@/components/features/account/account-security";
import { InstallAppBanner } from "@/components/shared/install-app-banner";

import { SettingsGroup, SettingsRow } from "@/components/features/profile/settings-row";
import { Avatar } from "@/components/ui/avatar";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth.actions";
import {
  Eye,
  Settings,
  Pencil,
  ArrowRight,
  ArrowLeft,
  User,
  Heart,
  Sparkles,
  FileText,
  Bookmark,
  Users as UsersIcon,
  Lock,
  ShieldCheck,
  LogOut
} from "lucide-react";
import type { ProfilePhotoRow } from "@/lib/supabase/database.types";

interface ProfilePageClientProps {
  initialProfile: UserProfile;
  initialPhotos: ProfilePhotoRow[];
}

const VALID_TABS = ["profile-edit", "faith-edit", "additional-info", "my-posts", "favorites", "who-likes-me", "privacy", "account"];

/** Format app native (profile_hub_body.dart) : liste groupée au lieu d'onglets à faire défiler — tapoter une ligne pousse une "page" plein écran (feuille mobile ci-dessous), jamais d'onglets horizontaux sur mobile. Desktop garde les pastilles d'onglets inchangées. */
const HUB_GROUPS: { title: string; rows: { id: string; label: string; icon: React.ReactNode; count?: boolean }[] }[] = [
  {
    title: "Mon compte",
    rows: [
      { id: "profile-edit", label: "Mon Profil", icon: <User size={16} /> },
      { id: "faith-edit", label: "Ma Foi", icon: <Heart size={16} /> },
      { id: "additional-info", label: "Plus d'infos", icon: <Sparkles size={16} /> }
    ]
  },
  {
    title: "Activité",
    rows: [
      { id: "my-posts", label: "Mes Publications", icon: <FileText size={16} />, count: true },
      { id: "favorites", label: "Mes Favoris", icon: <Bookmark size={16} /> },
      { id: "who-likes-me", label: "Qui s'intéresse à moi", icon: <UsersIcon size={16} /> }
    ]
  },
  {
    title: "Réglages",
    rows: [
      { id: "privacy", label: "Confidentialité", icon: <Lock size={16} /> },
      { id: "account", label: "Mon Compte & Sécurité", icon: <ShieldCheck size={16} /> }
    ]
  }
];

const SECTION_TITLES: Record<string, string> = {
  "profile-edit": "Mon Profil",
  "faith-edit": "Ma Foi",
  "additional-info": "Plus d'infos",
  "my-posts": "Mes Publications",
  favorites: "Mes Favoris",
  "who-likes-me": "Qui s'intéresse à moi",
  privacy: "Confidentialité",
  account: "Mon Compte & Sécurité"
};

function ProfilePageClientInner({ initialProfile, initialPhotos }: ProfilePageClientProps) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [profile, setProfile] = useState(initialProfile);
  const [mode, setMode] = useState<"PUBLIC_PREVIEW" | "ACCOUNT_SETTINGS">("ACCOUNT_SETTINGS");
  const [activeTab, setActiveTab] = useState(requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : "profile-edit");
  // Navigation mobile uniquement (format app native : hub + "pages" poussées
  // en plein écran) — null = liste groupée racine, sinon l'id de la section
  // actuellement ouverte en plein écran. Indépendant d'`activeTab`
  // (desktop), qui reste le seul état utilisé pour les pastilles d'onglets.
  const [mobileSection, setMobileSection] = useState<string | null>(requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : null);
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

  const handleUpdateAdditionalInfo = async (updated: AdditionalInfoUpdate) => {
    setProfile((prev) => ({
      ...prev,
      aboutMe: { ...prev.aboutMe, qualities: updated.qualities, hobbies: updated.hobbies },
      marriageVision: {
        ...prev.marriageVision,
        familyVision: updated.familyVision,
        desiredChildrenCount: updated.desiredChildrenCount,
        timelineYears: updated.marriageTimeline,
        coreValues: updated.coreValues
      },
      preferences: {
        ...prev.preferences,
        desiredValues: updated.desiredValues,
        desiredAgeMin: updated.desiredAgeMin,
        desiredAgeMax: updated.desiredAgeMax,
        desiredMaritalStatuses: updated.desiredMaritalStatuses,
        desiredCountries: updated.desiredCountries
      }
    }));
    await updateProfileAction({
      qualities: updated.qualities,
      hobbies: updated.hobbies,
      family_vision: updated.familyVision || null,
      desired_children_count: updated.desiredChildrenCount || null,
      marriage_timeline: updated.marriageTimeline || null,
      desired_values: updated.desiredValues,
      core_values: updated.coreValues,
      desired_age_min: updated.desiredAgeMin,
      desired_age_max: updated.desiredAgeMax,
      desired_marital_statuses: updated.desiredMaritalStatuses,
      desired_countries: updated.desiredCountries
    });
  };

  const handleUpdatePrivacyAndNotifications = async (privacy: UserPrivacySettings, notifications: UserNotificationSettings) => {
    setProfile((prev) => ({ ...prev, privacySettings: privacy, notificationSettings: notifications }));
    await updateProfileAction({
      show_online_status: privacy.showOnlineStatus,
      show_read_receipts: privacy.showReadReceipts,
      allow_profile_visits: privacy.allowProfileVisits,
      is_invisible_profile: privacy.isInvisibleProfile,
      notify_messages: notifications.notifyMessages,
      notify_favorites: notifications.notifyFavorites,
      notify_recommendations: notifications.notifyRecommendations,
      notify_official_posts: notifications.notifyOfficialPosts,
      notify_comments: notifications.notifyComments,
      notify_likes: notifications.notifyLikes,
      notify_email_digest: notifications.notifyEmailDigest
    });
  };

  const renderSectionContent = (tabId: string) => (
    <>
      {tabId === "profile-edit" && <AccountProfileForm profile={profile} initialPhotos={initialPhotos} onSave={handleUpdateProfile} />}
      {tabId === "faith-edit" && <AccountFaithForm faith={profile.faith} onSave={handleUpdateFaith} />}
      {tabId === "additional-info" && <AccountAdditionalInfoForm profile={profile} onSave={handleUpdateAdditionalInfo} />}
      {tabId === "my-posts" && <AccountMyPosts publications={personalPosts} />}
      {tabId === "favorites" && <AccountFavorites />}
      {tabId === "who-likes-me" && <AccountWhoLikesMe profile={profile} />}
      {tabId === "privacy" && (
        <AccountPrivacySettings
          privacy={profile.privacySettings}
          notifications={profile.notificationSettings}
          onSave={handleUpdatePrivacyAndNotifications}
        />
      )}
      {tabId === "account" && <AccountSecurity profile={profile} />}
    </>
  );

  const onboardingCorrectionBanner = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-3xl bg-accent-subtle/80 border border-accent/20 px-5 py-4 sm:py-3.5 shadow-soft select-none">
      <div className="flex items-center gap-3 sm:contents">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shrink-0 shadow-accent-glow">
          <Pencil size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Personnalité, vision du mariage, préférences</p>
          <p className="text-xs text-muted-foreground">Reviens à tout moment corriger ou compléter tes réponses d&apos;inscription.</p>
        </div>
      </div>
      <Link
        href="/onboarding"
        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-95 transition-opacity rounded-full px-4 py-2.5 sm:py-2 w-full sm:w-auto shrink-0 shadow-accent-glow"
      >
        Modifier
        <ArrowRight size={13} />
      </Link>
    </div>
  );

  const publicPreviewContent = (
    <div className="space-y-6">
      <ProfileHero
        profile={profile}
        isFavorite={false}
        onToggleFavorite={() => {}}
        isLiked={false}
        onToggleLike={() => {}}
        onSendMessage={() => {}}
        isOwnProfile
      />
      <FaithSection faith={profile.faith} />
      <MarriageVisionSection marriageVision={profile.marriageVision} aboutMe={profile.aboutMe} preferences={profile.preferences} />
      <UserPublicationsSection userName={profile.firstName} profileId={profile.id} publications={personalPosts} isOwner />
    </div>
  );

  return (
    <div className="w-full pb-16 select-none">
      {/* Mobile : hub de réglages façon app native (profile_hub_body.dart) —
          liste groupée, chaque ligne ouvre sa section en plein écran avec
          une flèche retour. Jamais d'onglets à faire défiler horizontalement
          ici. Desktop (ci-dessous) garde exactement sa mise en page actuelle. */}
      <div className="md:hidden space-y-5">
        {mode === "PUBLIC_PREVIEW" ? (
          <>
            <button
              type="button"
              onClick={() => setMode("ACCOUNT_SETTINGS")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={16} /> Retour
            </button>
            {publicPreviewContent}
          </>
        ) : mobileSection === null ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar size="lg" src={profile.avatarUrl} fallback={profile.firstName.charAt(0)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-display font-semibold text-foreground truncate">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  {profile.badges.some((b) => b.code === "VERIFIED_FAITH") && <ShieldCheck size={15} className="text-primary shrink-0" />}
                </div>
                <button
                  type="button"
                  onClick={() => setMode("PUBLIC_PREVIEW")}
                  className="text-xs font-semibold text-primary flex items-center gap-1"
                >
                  <Eye size={12} /> Voir mon profil public
                </button>
              </div>
            </div>

            {onboardingCorrectionBanner}
            <InstallAppBanner />

            {HUB_GROUPS.map((group) => (
              <SettingsGroup key={group.title} title={group.title}>
                {group.rows.map((row) => (
                  <SettingsRow
                    key={row.id}
                    icon={row.icon}
                    label={row.label}
                    value={row.count ? `${personalPosts.length}` : undefined}
                    onClick={() => setMobileSection(row.id)}
                  />
                ))}
              </SettingsGroup>
            ))}

            <SettingsGroup>
              <form action={signOutAction}>
                <button type="submit" className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 active:bg-secondary/70">
                  <div className="w-9 h-9 rounded-xl bg-destructive/12 text-destructive flex items-center justify-center shrink-0">
                    <LogOut size={16} />
                  </div>
                  <span className="text-sm font-medium text-destructive flex-1">Déconnexion</span>
                </button>
              </form>
            </SettingsGroup>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setMobileSection(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={16} /> {SECTION_TITLES[mobileSection]}
            </button>
            {renderSectionContent(mobileSection)}
          </>
        )}
      </div>

      {/* Desktop : mise en page par onglets inchangée. */}
      <div className="hidden md:block space-y-6">
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
            {onboardingCorrectionBanner}

            <InstallAppBanner />

            <div className="overflow-x-auto pb-1 no-scrollbar">
              <Tabs
                variant="pill"
                tabs={[
                  { id: "profile-edit", label: "Mon Profil" },
                  { id: "faith-edit", label: "Ma Foi" },
                  { id: "additional-info", label: "Plus d'infos" },
                  { id: "my-posts", label: "Mes Publications", count: personalPosts.length },
                  { id: "favorites", label: "Mes Favoris" },
                  { id: "who-likes-me", label: "Qui s'intéresse à moi" },
                  { id: "privacy", label: "Confidentialité" },
                  { id: "account", label: "Mon Compte & Sécurité" }
                ]}
                activeTabId={activeTab}
                onChange={setActiveTab}
              />
            </div>

            {renderSectionContent(activeTab)}
          </div>
        )}

        {mode === "PUBLIC_PREVIEW" && publicPreviewContent}
      </div>
    </div>
  );
}

export function ProfilePageClient(props: ProfilePageClientProps) {
  return (
    <Suspense fallback={null}>
      <ProfilePageClientInner {...props} />
    </Suspense>
  );
}
