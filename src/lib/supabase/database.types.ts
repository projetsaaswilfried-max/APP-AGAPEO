/**
 * Types générés à la main d'après supabase/migrations/*.sql.
 * Dès que le projet Supabase est lié, remplace ce fichier par le résultat de :
 *   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 * pour repartir d'une source de vérité générée automatiquement.
 */

export type AppRole = "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
export type GenderType = "MALE" | "FEMALE";
export type RelationshipStatusDb = "AVAILABLE" | "IN_DISCUSSION" | "ON_PAUSE";
export type MaritalStatusType = "SINGLE_NO_CHILDREN" | "SINGLE_WITH_CHILDREN" | "DIVORCED" | "WIDOWED";
export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
export type PhotoModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PostType = "OFFICIAL" | "PERSONAL";
export type PostCategory = "TEACHING" | "TESTIMONY" | "WORKSHOP" | "ADVICE" | "ANNOUNCEMENT" | "QUOTE" | "VERSE" | "NEWS";
export type PostMediaTypeDb = "IMAGE" | "GALLERY" | "VIDEO" | "YOUTUBE" | "QUOTE_CARD" | "TEXT_ONLY";

export type MessageTypeDb = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "VOICE" | "SYSTEM";
export type MessageStatusDb = "SENT" | "DELIVERED" | "READ";
export type AttachmentTypeDb = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";

export type NotificationTypeDb =
  | "NEW_MESSAGE"
  | "CONVERSATION_INVITE"
  | "CONVERSATION_ACCEPTED"
  | "NEW_FAVORITE"
  | "PROFILE_VISIT"
  | "MATCH_REQUEST"
  | "MATCH_ACCEPTED"
  | "POST_LIKE"
  | "POST_COMMENT"
  | "NEW_RECOMMENDATION"
  | "OFFICIAL_POST"
  | "SUPPORT_REPLY"
  | "NEW_RESOURCE"
  | "PHOTO_APPROVED"
  | "PHOTO_REJECTED";

export type ConversationStatus = "PENDING" | "ACCEPTED" | "DECLINED";
export type MatchStatus = "PENDING" | "ACCEPTED" | "CANCELLED";

export type ReportTargetType = "PROFILE" | "MESSAGE" | "POST";
export type ReportStatus = "PENDING" | "REVIEWED" | "DISMISSED" | "ACTION_TAKEN";

export type SubscriptionStatus = "FREE" | "ACTIVE" | "CANCELED" | "EXPIRED";
export type TransactionStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
export type EmailCampaignStatus = "SCHEDULED" | "SENT" | "FAILED" | "CANCELED";

/** `Relationships` est requis par le type `GenericTable` de @supabase/supabase-js — vide ici (aucune jointure FK exploitée via l'API PostgREST imbriquée). */
type Rel<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  gender: GenderType;
  birth_date: string;
  city: string | null;
  country: string;
  profession: string | null;
  education_level: string | null;
  languages: string[];
  height_cm: number | null;
  avatar_url: string | null;
  bio: string | null;
  quote: string | null;
  status: RelationshipStatusDb;

  marital_status: MaritalStatusType | null;

  church_denomination: string | null;
  faith_engagement_level: string | null;
  ministry: string | null;
  faith_journey_years: number | null;
  faith_description: string | null;
  baptized: boolean;
  community_engagement: string | null;
  favorite_verse: string | null;
  testimony: string | null;
  current_god_action: string | null;

  personality_traits: string[];
  passions: string[];
  hobbies: string[];
  qualities: string[];
  likes: string[];
  dislikes: string[];

  why_marriage: string | null;
  couple_vision: string | null;
  family_vision: string | null;
  has_children: boolean;
  children_count: number;
  desired_children_count: string | null;
  relocation_ready: boolean;
  marriage_timeline: string | null;
  core_values: string[];

  desired_age_min: number;
  desired_age_max: number;
  desired_countries: string[];
  desired_denomination: string | null;
  desired_values: string[];
  desired_interests: string[];
  desired_marital_statuses: MaritalStatusType[];
  wants_children: boolean | null;

  show_online_status: boolean;
  show_read_receipts: boolean;
  allow_profile_visits: boolean;
  is_invisible_profile: boolean;
  is_photo_blurred: boolean;

  notify_messages: boolean;
  notify_favorites: boolean;
  notify_recommendations: boolean;
  notify_official_posts: boolean;
  notify_comments: boolean;
  notify_likes: boolean;
  notify_profile_visits: boolean;
  notify_email_digest: boolean;

  email_verified: boolean;
  phone_verified: boolean;
  photo_verification_status: VerificationStatus;

  onboarding_completed: boolean;
  onboarding_step: number;

  is_test_account: boolean;
  /** Dérivé de `profile_restricted.role <> 'USER'` — badge public "équipe", jamais le rôle exact (cf. migration lock_down_restricted_profile_fields). */
  is_staff: boolean;
  /** Dérivé de `profile_restricted.subscription_status = 'ACTIVE'` — booléen public utilisé pour prioriser Découvrir, jamais le détail de l'abonnement. */
  is_premium: boolean;
  /** Dérivé de `matches.status = 'ACCEPTED'` — exclut le profil de Découvrir tant qu'un match est actif (cf. matches table). */
  is_matched: boolean;

  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export type ProfileInsert = Pick<ProfileRow, "id" | "first_name" | "gender" | "birth_date" | "country"> &
  Partial<Omit<ProfileRow, "id" | "first_name" | "gender" | "birth_date" | "country">>;
export type ProfileUpdate = Partial<Omit<ProfileRow, "id" | "created_at">>;

export interface ProfilePrivateRow {
  id: string;
  phone: string | null;
  phone_country_code: string | null;
  created_at: string;
}
export type ProfilePrivateUpdate = Partial<Omit<ProfilePrivateRow, "id" | "created_at">>;

/**
 * Champs jamais destinés à un autre membre (rôle, suspension, abonnement,
 * géolocalisation) — isolés de `profiles` car RLS filtre par ligne, pas par
 * colonne (cf. migration lock_down_restricted_profile_fields). Lecture
 * limitée à son propre id ; écriture réservée au client service_role.
 */
export interface ProfileRestrictedRow {
  id: string;
  role: AppRole;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  subscription_status: SubscriptionStatus;
  subscription_plan: string | null;
  subscription_current_period_end: string | null;
  /** Palier de relance déjà envoyé sur le cycle en cours : 5, 3 ou 1 (jours avant échéance) — null si aucun. */
  subscription_reminder_stage: number | null;
  /** Horodatage du passage à EXPIRED (retrait automatique pour non-paiement) — null si jamais expiré ou déjà réabonné. */
  subscription_expired_at: string | null;
  /** true une fois la relance des 24h après expiration envoyée — évite un doublon. */
  subscription_expiry_followup_sent: boolean;
  /** Palier déjà envoyé (1/3/5/7) de la séquence "soumets ton profil" — null si aucun. */
  onboarding_sequence_stage: number | null;
  /** Palier déjà envoyé (1/3/5/7) de la séquence "passe Premium" — null si aucun ; remis à null à chaque nouvelle validation de profil. */
  premium_sequence_stage: number | null;
  latitude: number | null;
  longitude: number | null;
}
export type ProfileRestrictedUpdate = Partial<Omit<ProfileRestrictedRow, "id">>;

export interface VerificationRequestRow {
  id: string;
  user_id: string;
  status: VerificationStatus;
  is_priority: boolean;
  selfie_storage_path: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
}
export type VerificationRequestInsert = Pick<VerificationRequestRow, "user_id" | "is_priority" | "selfie_storage_path">;
export type VerificationRequestUpdate = Partial<Pick<VerificationRequestRow, "status" | "reviewed_at" | "reviewed_by" | "rejection_reason">>;

export interface ProfilePhotoRow {
  id: string;
  profile_id: string;
  url: string;
  storage_path: string;
  is_primary: boolean;
  caption: string | null;
  position: number;
  /** PENDING tant que l'équipe n'a pas revu la photo — jamais visible par quelqu'un d'autre que le propriétaire avant APPROVED. */
  moderation_status: PhotoModerationStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  /** Selfie pris en direct pour CETTE photo précise — uniquement pour un ajout fait après une première vérification déjà validée (cf. addVerifiedProfilePhotosAction). NULL sinon. */
  selfie_storage_path: string | null;
  created_at: string;
}
export type ProfilePhotoInsert = Pick<ProfilePhotoRow, "profile_id" | "url" | "storage_path"> &
  Partial<Pick<ProfilePhotoRow, "is_primary" | "caption" | "position" | "selfie_storage_path">>;

export interface FavoriteRow {
  id: string;
  user_id: string;
  favorite_profile_id: string;
  created_at: string;
}

export interface PostRow {
  id: string;
  author_id: string;
  post_type: PostType;
  category: PostCategory | null;
  title: string | null;
  content: string;
  media_type: PostMediaTypeDb;
  video_url: string | null;
  video_thumbnail: string | null;
  quote_text: string | null;
  quote_author: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_pinned: boolean;
  pinned_position: number | null;
  created_at: string;
  updated_at: string;
}
export type PostInsert = Pick<PostRow, "author_id" | "post_type" | "content"> &
  Partial<Omit<PostRow, "id" | "author_id" | "post_type" | "content" | "likes_count" | "comments_count" | "shares_count" | "created_at" | "updated_at">>;

export interface PostMediaRow {
  id: string;
  post_id: string;
  url: string;
  storage_path: string;
  position: number;
}

export interface PostLikeRow {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostCommentRow {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
}

export interface PostBookmarkRow {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  status: ConversationStatus;
  initiated_by: string | null;
  created_at: string;
  last_message_at: string;
}

export interface MatchRow {
  id: string;
  conversation_id: string;
  requester_id: string;
  recipient_id: string;
  status: MatchStatus;
  created_at: string;
  responded_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
}

export interface ConversationParticipantRow {
  conversation_id: string;
  user_id: string;
  is_favorite: boolean;
  last_read_at: string;
  joined_at: string;
  hidden_at: string | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: MessageTypeDb;
  content: string | null;
  status: MessageStatusDb;
  read_at: string | null;
  reminder_email_sent_at: string | null;
  deleted_at: string | null;
  created_at: string;
}
export type MessageInsert = Pick<MessageRow, "conversation_id" | "sender_id"> &
  Partial<Pick<MessageRow, "type" | "content" | "status">>;

export interface MessageAttachmentRow {
  id: string;
  message_id: string;
  type: AttachmentTypeDb;
  storage_path: string;
  url: string | null;
  file_name: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  mime_type: string | null;
}
export type MessageAttachmentInsert = Pick<MessageAttachmentRow, "message_id" | "type" | "storage_path"> &
  Partial<Omit<MessageAttachmentRow, "id" | "message_id" | "type" | "storage_path">>;

export interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationTypeDb;
  title: string;
  body: string | null;
  target_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface BlockRow {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface ReportRow {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
}
export type ReportInsert = Pick<ReportRow, "reporter_id" | "target_type" | "target_id" | "reason"> &
  Partial<Pick<ReportRow, "details">>;

export interface TransactionRow {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  status: TransactionStatus;
  plan: string | null;
  provider: string | null;
  provider_reference: string | null;
  created_at: string;
}

export interface EmailCampaignRow {
  id: string;
  sender_id: string | null;
  subject: string;
  body_html: string;
  audience: string;
  recipients_count: number;
  failed_count: number;
  status: EmailCampaignStatus;
  scheduled_for: string | null;
  direct_recipient_id: string | null;
  sent_at: string;
}
export type EmailCampaignInsert = Pick<EmailCampaignRow, "sender_id" | "subject" | "body_html" | "audience"> &
  Partial<Pick<EmailCampaignRow, "recipients_count" | "failed_count" | "status" | "scheduled_for" | "direct_recipient_id">>;
export type EmailCampaignUpdate = Partial<Pick<EmailCampaignRow, "status" | "recipients_count" | "failed_count">>;

export type SupportTicketStatus = "OPEN" | "CLOSED";

export interface SupportTicketRow {
  id: string;
  user_id: string;
  subject: string;
  status: SupportTicketStatus;
  last_message_at: string;
  created_at: string;
  closed_at: string | null;
  closed_by: string | null;
}
export type SupportTicketInsert = Pick<SupportTicketRow, "user_id" | "subject">;
export type SupportTicketUpdate = Partial<Pick<SupportTicketRow, "status" | "closed_at" | "closed_by">>;

export interface SupportMessageRow {
  id: string;
  ticket_id: string;
  user_id: string;
  author_id: string;
  is_staff: boolean;
  content: string;
  attachment_path: string | null;
  attachment_mime_type: string | null;
  is_read: boolean;
  created_at: string;
}
export type SupportMessageInsert = Pick<SupportMessageRow, "ticket_id" | "user_id" | "author_id" | "is_staff" | "content"> &
  Partial<Pick<SupportMessageRow, "attachment_path" | "attachment_mime_type">>;

export interface AdminAuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
export type AdminAuditLogInsert = Pick<AdminAuditLogRow, "actor_id" | "action"> &
  Partial<Pick<AdminAuditLogRow, "target_type" | "target_id" | "details">>;

export interface Database {
  public: {
    Views: Record<string, never>;
    Enums: {
      app_role: AppRole;
      gender_type: GenderType;
      relationship_status: RelationshipStatusDb;
      verification_status: VerificationStatus;
      post_type: PostType;
      post_category: PostCategory;
      message_type: MessageTypeDb;
      message_status: MessageStatusDb;
      attachment_type: AttachmentTypeDb;
      notification_type: NotificationTypeDb;
      report_target_type: ReportTargetType;
      report_status: ReportStatus;
      subscription_status: SubscriptionStatus;
      transaction_status: TransactionStatus;
      email_campaign_status: EmailCampaignStatus;
      support_ticket_status: SupportTicketStatus;
    };
    CompositeTypes: Record<string, never>;
    Tables: {
      profiles: Rel<ProfileRow, ProfileInsert, ProfileUpdate>;
      profile_private: Rel<ProfilePrivateRow, ProfilePrivateRow, ProfilePrivateUpdate>;
      profile_restricted: Rel<ProfileRestrictedRow, ProfileRestrictedRow, ProfileRestrictedUpdate>;
      verification_requests: Rel<VerificationRequestRow, VerificationRequestInsert, VerificationRequestUpdate>;
      profile_photos: Rel<ProfilePhotoRow, ProfilePhotoInsert, Partial<ProfilePhotoRow>>;
      favorites: Rel<FavoriteRow, Omit<FavoriteRow, "id" | "created_at">, Partial<FavoriteRow>>;
      posts: Rel<PostRow, PostInsert, Partial<PostRow>>;
      post_media: Rel<PostMediaRow, Omit<PostMediaRow, "id">, Partial<PostMediaRow>>;
      post_likes: Rel<PostLikeRow, PostLikeRow, Partial<PostLikeRow>>;
      post_comments: Rel<
        PostCommentRow,
        Pick<PostCommentRow, "post_id" | "author_id" | "content"> & Partial<Pick<PostCommentRow, "parent_comment_id">>,
        Partial<PostCommentRow>
      >;
      post_bookmarks: Rel<PostBookmarkRow, PostBookmarkRow, Partial<PostBookmarkRow>>;
      post_shares: Rel<{ id: string; post_id: string; user_id: string; created_at: string }, { post_id: string; user_id: string }, never>;
      conversations: Rel<ConversationRow, Partial<ConversationRow>, Partial<ConversationRow>>;
      conversation_participants: Rel<
        ConversationParticipantRow,
        Pick<ConversationParticipantRow, "conversation_id" | "user_id"> & Partial<ConversationParticipantRow>,
        Partial<ConversationParticipantRow>
      >;
      messages: Rel<MessageRow, MessageInsert, Partial<Pick<MessageRow, "status" | "read_at" | "reminder_email_sent_at" | "deleted_at">>>;
      message_attachments: Rel<MessageAttachmentRow, MessageAttachmentInsert, Partial<MessageAttachmentRow>>;
      notifications: Rel<NotificationRow, Partial<NotificationRow>, Partial<Pick<NotificationRow, "is_read">>>;
      profile_views: Rel<{ id: string; viewer_id: string; viewed_profile_id: string; created_at: string }, never, never>;
      blocks: Rel<BlockRow, Omit<BlockRow, "created_at">, Partial<BlockRow>>;
      push_subscriptions: Rel<PushSubscriptionRow, Omit<PushSubscriptionRow, "id" | "created_at">, never>;
      reports: Rel<ReportRow, ReportInsert, Partial<Pick<ReportRow, "status">>>;
      transactions: Rel<TransactionRow, Omit<TransactionRow, "id" | "created_at">, Partial<TransactionRow>>;
      email_campaigns: Rel<EmailCampaignRow, EmailCampaignInsert, EmailCampaignUpdate>;
      admin_audit_log: Rel<AdminAuditLogRow, AdminAuditLogInsert, never>;
      support_tickets: Rel<SupportTicketRow, SupportTicketInsert, SupportTicketUpdate>;
      support_messages: Rel<SupportMessageRow, SupportMessageInsert, Partial<Pick<SupportMessageRow, "is_read">>>;
    };
    Functions: {
      record_profile_view: { Args: { viewed_profile_id: string }; Returns: void };
      is_admin_or_moderator: { Args: { uid: string }; Returns: boolean };
      create_conversation_with_participant: { Args: { other_user_id: string }; Returns: string };
      get_my_blocked_profiles: { Args: Record<string, never>; Returns: { id: string; first_name: string; avatar_url: string | null }[] };
      is_blocked: { Args: { a: string; b: string }; Returns: boolean };
    };
  };
}
