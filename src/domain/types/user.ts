import { FeedPublication } from "./feed";

export type GenderType = "MALE" | "FEMALE";
export type MaritalStatusType = "SINGLE" | "DIVORCED" | "WIDOWED";

export interface UserFaithProfile {
  churchDenomination: string;
  faithJourneyYears: number;
  faithDescription: string;
  baptized: boolean;
  communityEngagement: string;
  favoriteVerse?: string;
  testimony?: string;
  currentGodAction?: string;
}

export interface UserMarriageVision {
  whyMarriage: string;
  coupleVision: string;
  familyVision: string;
  desiredChildrenCount: string;
  relocationReady: boolean;
  timelineYears: string;
  coreValues: string[];
}

export interface UserAboutMe {
  personalityTraits: string[];
  passions: string[];
  hobbies: string[];
  qualities: string[];
  likes: string[];
  dislikes: string[];
}

export interface UserPartnerPreferences {
  desiredAgeMin: number;
  desiredAgeMax: number;
  desiredValues: string[];
  desiredInterests: string[];
  desiredCountries: string[];
  desiredDenomination?: string;
  desiredMaritalStatuses: MaritalStatusType[];
  wantsChildren?: boolean;
}

export interface UserPrivacySettings {
  showOnlineStatus: boolean;
  showReadReceipts: boolean;
  allowProfileVisits: boolean;
  isInvisibleProfile: boolean;
  isPhotoBlurred: boolean; // Option de floutage des photos pour le grand public
  allowEmailNotifications: boolean;
}

export interface UserNotificationSettings {
  notifyMessages: boolean;
  notifyFavorites: boolean;
  notifyRecommendations: boolean;
  notifyOfficialPosts: boolean;
  notifyComments: boolean;
  notifyLikes: boolean;
  notifyEmailDigest: boolean;
}

export interface UserPhoto {
  id: string;
  url: string;
  isPrimary: boolean;
  caption?: string;
}

export interface UserBadge {
  id: string;
  code: "VERIFIED_FAITH" | "IDENTITY_VERIFIED" | "MARRIAGE_COMMITMENT" | "ACTIVE_MEMBER";
  label: string;
  icon: string;
}

export interface UserProfile {
  id: string;
  gender: GenderType;
  maritalStatus: MaritalStatusType | null;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  phoneCountryCode?: string;
  age: number;
  city: string;
  country: string;
  profession: string;
  educationLevel: string;
  languages: string[];
  status: "AVAILABLE" | "IN_DISCUSSION" | "ON_PAUSE";
  statusLabel: string;
  compatibilityPercentage: number;
  bio: string;
  quote?: string;
  avatarUrl: string;
  photos: UserPhoto[];
  faith: UserFaithProfile;
  marriageVision: UserMarriageVision;
  aboutMe: UserAboutMe;
  preferences: UserPartnerPreferences;
  privacySettings?: UserPrivacySettings;
  notificationSettings?: UserNotificationSettings;
  compatibilityReasons: string[];
  personalPublications: FeedPublication[];
  badges: UserBadge[];
  photoVerificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  subscriptionStatus?: "FREE" | "ACTIVE" | "CANCELED" | "EXPIRED";
  subscriptionCurrentPeriodEnd?: string;
  createdAt: string;
  lastActiveAt: string;
}
