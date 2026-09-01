import { UserProfile } from "./user";

export interface DiscoverFilterCriteria {
  searchQuery?: string;
  ageMin?: number;
  ageMax?: number;
  country?: string;
  city?: string;
  profession?: string;
  educationLevel?: string;
  denomination?: string;
  faithEngagementLevel?: string;
  ministry?: string;
  language?: string;
  hasChildren?: boolean;
  wantsChildren?: boolean;
  coreValue?: string;
  status?: string;
  maritalStatus?: string;
}

export interface RecommendedProfileItem {
  profile: UserProfile;
  compatibilityPercentage: number;
  status: string;
  statusLabel: string;
  justifications: string[];
  isFavorite: boolean;
  isLiked: boolean;
  isPremium: boolean;
}
