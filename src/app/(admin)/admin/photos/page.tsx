import { createAdminClient } from "@/lib/supabase/admin";
import { getUserIdsWithPendingVerification } from "@/lib/admin/pending-photo-queue";
import { AdminPhotosList, type AdminPhotoRow } from "@/components/features/admin/admin-photos-list";
import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";

export default async function AdminPhotosPage() {
  const admin = createAdminClient();

  const [{ data: photos }, usersWithPendingVerification] = await Promise.all([
    admin.from("profile_photos").select("*").eq("moderation_status", "PENDING").order("created_at", { ascending: true }),
    getUserIdsWithPendingVerification(admin)
  ]);

  // Les photos d'un membre dont le dossier de vérification est encore en
  // attente sont déjà affichées (et comparées à son selfie) dans "Vérifications"
  // — les afficher aussi ici ferait traiter la même photo deux fois. Elles
  // réapparaîtront naturellement ici si ce dossier est refusé (le refus ne
  // les approuve/rejette pas automatiquement, cf. rejectVerificationRequestAction).
  const rows = ((photos ?? []) as ProfilePhotoRow[]).filter((p) => !usersWithPendingVerification.has(p.profile_id));
  if (rows.length === 0) {
    return <AdminPhotosList initialItems={[]} />;
  }

  const userIds = [...new Set(rows.map((r) => r.profile_id))];
  const { data: profiles } = await admin.from("profiles").select("*").in("id", userIds);
  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  // URLs signées (bucket privé verification-selfies) pour les photos ajoutées
  // après une première vérification — même convention que la page Vérifications.
  const selfiePaths = rows.map((r) => r.selfie_storage_path).filter((p): p is string => Boolean(p));
  const selfieUrlByPath = new Map<string, string>();
  if (selfiePaths.length > 0) {
    const { data: signed } = await admin.storage.from("verification-selfies").createSignedUrls(selfiePaths, 3600);
    (signed ?? []).forEach((s) => {
      if (s.signedUrl && s.path) selfieUrlByPath.set(s.path, s.signedUrl);
    });
  }

  const items: AdminPhotoRow[] = rows
    .map((r) => {
      const profile = profileById.get(r.profile_id);
      if (!profile) return null;
      return {
        photoId: r.id,
        userId: r.profile_id,
        url: r.url,
        submittedAt: r.created_at,
        isPremium: profile.is_premium,
        profile,
        selfieUrl: r.selfie_storage_path ? (selfieUrlByPath.get(r.selfie_storage_path) ?? null) : null
      };
    })
    .filter((item): item is AdminPhotoRow => item !== null);

  return <AdminPhotosList initialItems={items} />;
}
