import type { SessionProfile } from "@/lib/supabase/session";

/**
 * Mode aperçu réservé à l'équipe : voir l'interface membre telle qu'un
 * abonné ou un non-abonné la voit (sans cela, le staff contourne tous les
 * verrous Premium). Purement visuel — la base (RLS) et les Server Actions
 * continuent de traiter le compte avec ses vrais droits.
 */
export type PreviewMode = "subscriber" | "free";

export const PREVIEW_MODE_COOKIE = "agapeo_preview_mode";

export function parsePreviewMode(value: string | undefined): PreviewMode | null {
  return value === "subscriber" || value === "free" ? value : null;
}

export function canUsePreviewMode(profile: Pick<SessionProfile, "role">) {
  return profile.role !== "USER";
}

/** Profil tel que l'interface doit le voir dans ce mode : un membre ordinaire, abonné (plan mensuel) ou non. */
export function applyPreviewMode(profile: SessionProfile, mode: PreviewMode): SessionProfile {
  const isSubscriber = mode === "subscriber";
  return {
    ...profile,
    role: "USER",
    is_staff: false,
    is_premium: isSubscriber,
    subscription_status: isSubscriber ? "ACTIVE" : "FREE",
    subscription_plan: isSubscriber ? (profile.subscription_plan ?? "premium_monthly") : null,
    subscription_current_period_end: isSubscriber
      ? (profile.subscription_current_period_end ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      : null,
    subscription_expired_at: null
  };
}
