import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Membres dont le dossier de vérification est encore PENDING : leurs photos
 * sont déjà traitées (et comparées au selfie) dans ce dossier, jamais dans
 * la file générale "Photos" (cf. admin/photos/page.tsx) — sinon l'équipe
 * traiterait deux fois la même photo. Centralisé ici pour que le badge de
 * comptage de la navigation admin et la page elle-même ne puissent jamais
 * diverger (le badge affichait un nombre alors que la page, elle, excluait
 * déjà ces mêmes photos et se retrouvait vide).
 */
export async function getUserIdsWithPendingVerification(admin: ReturnType<typeof createAdminClient>): Promise<Set<string>> {
  const { data } = await admin.from("verification_requests").select("user_id").eq("status", "PENDING");
  return new Set((data ?? []).map((r) => r.user_id));
}

/** Nombre de photos réellement en attente dans la file générale "Photos" — hors dossiers de vérification déjà en cours. */
export async function countPendingPhotosOutsideVerification(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const [{ data: photos }, excludedUserIds] = await Promise.all([
    admin.from("profile_photos").select("profile_id").eq("moderation_status", "PENDING"),
    getUserIdsWithPendingVerification(admin)
  ]);
  return (photos ?? []).filter((p) => !excludedUserIds.has(p.profile_id)).length;
}
