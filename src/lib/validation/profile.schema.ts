import { z } from "zod";

const tagsArray = (max: number) => z.array(z.string().trim().min(1)).max(max);

/**
 * Liste blanche des colonnes que le titulaire d'un profil peut modifier
 * lui-même. `role`, les statuts de vérification et l'identité posée à
 * l'inscription (genre, date de naissance) en sont volontairement exclus —
 * ce schéma est la première ligne de défense, la RLS + le trigger
 * `protect_privileged_profile_columns` sont la seconde (règle 17).
 */
export const ProfileEditableSchema = z.object({
  first_name: z.string().trim().min(2).max(60),
  last_name: z.string().trim().max(60),
  city: z.string().trim().max(80).nullable(),
  country: z.string().trim().min(2).max(80),
  profession: z.string().trim().max(120).nullable(),
  education_level: z.string().trim().max(120).nullable(),
  languages: tagsArray(8),
  height_cm: z.number().int().min(120).max(230).nullable(),
  bio: z.string().trim().max(1000).nullable(),
  quote: z.string().trim().max(200).nullable(),
  status: z.enum(["AVAILABLE", "IN_DISCUSSION", "ON_PAUSE"]),

  church_denomination: z.string().trim().max(120).nullable(),
  faith_engagement_level: z.string().trim().max(60).nullable(),
  ministry: z.string().trim().max(120).nullable(),
  faith_journey_years: z.number().int().min(0).max(90).nullable(),
  faith_description: z.string().trim().max(1000).nullable(),
  baptized: z.boolean(),
  community_engagement: z.string().trim().max(500).nullable(),
  favorite_verse: z.string().trim().max(300).nullable(),
  testimony: z.string().trim().max(2000).nullable(),
  current_god_action: z.string().trim().max(1000).nullable(),

  personality_traits: tagsArray(10),
  passions: tagsArray(12),
  hobbies: tagsArray(12),
  qualities: tagsArray(10),
  likes: tagsArray(10),
  dislikes: tagsArray(10),

  why_marriage: z.string().trim().max(1000).nullable(),
  couple_vision: z.string().trim().max(1000).nullable(),
  family_vision: z.string().trim().max(1000).nullable(),
  has_children: z.boolean(),
  children_count: z.number().int().min(0).max(20),
  desired_children_count: z.string().trim().max(40).nullable(),
  relocation_ready: z.boolean(),
  marriage_timeline: z.string().trim().max(60).nullable(),
  core_values: tagsArray(12),

  desired_age_min: z.number().int().min(18).max(99),
  desired_age_max: z.number().int().min(18).max(99),
  desired_countries: tagsArray(10),
  desired_denomination: z.string().trim().max(120).nullable(),
  desired_values: tagsArray(12),
  desired_interests: tagsArray(12),
  wants_children: z.boolean().nullable(),

  show_online_status: z.boolean(),
  show_read_receipts: z.boolean(),
  allow_profile_visits: z.boolean(),
  is_invisible_profile: z.boolean(),
  is_photo_blurred: z.boolean(),

  notify_messages: z.boolean(),
  notify_favorites: z.boolean(),
  notify_recommendations: z.boolean(),
  notify_official_posts: z.boolean(),
  notify_comments: z.boolean(),
  notify_likes: z.boolean(),
  notify_profile_visits: z.boolean(),
  notify_email_digest: z.boolean(),

  avatar_url: z.string().url().nullable()
});

export type ProfileEditableInput = z.infer<typeof ProfileEditableSchema>;
export const ProfileEditablePartialSchema = ProfileEditableSchema.partial();

/**
 * Réservé aux comptes créés par un fournisseur OAuth (ex: Google), qui ne
 * transmet jamais genre/date de naissance et rarement le pays — ces champs
 * sont NULL juste après la création du compte dans ce cas précis (cf.
 * migration oauth_nullable_identity_fields). Une inscription email/mot de
 * passe classique (RegisterSchema) les a déjà tous les trois : cette étape
 * ne s'affiche alors jamais.
 */
export const EssentialInfoSchema = z.object({
  gender: z.enum(["MALE", "FEMALE"], { message: "Sélectionne ton genre." }),
  birthDate: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), "Date de naissance invalide.")
    .refine((val) => {
      const age = (Date.now() - new Date(val).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18;
    }, "Tu dois avoir au moins 18 ans."),
  country: z.string().trim().min(2, "Sélectionne ton pays de résidence.")
});

export const PhoneSchema = z.object({
  phone: z.string().trim().max(30).nullable(),
  phone_country_code: z.string().trim().max(6).nullable()
});

export const ReportSchema = z.object({
  targetType: z.enum(["PROFILE", "MESSAGE", "POST"]),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(3).max(120),
  details: z.string().trim().max(1000).optional()
});
