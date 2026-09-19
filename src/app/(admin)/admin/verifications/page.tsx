import { createAdminClient } from "@/lib/supabase/admin";
import { AdminVerificationsList, type AdminVerificationRow } from "@/components/features/admin/admin-verifications-list";
import type { ProfileRow, ProfilePhotoRow, VerificationRequestRow } from "@/lib/supabase/database.types";

export default async function AdminVerificationsPage() {
  const admin = createAdminClient();

  const { data: requests } = await admin
    .from("verification_requests")
    .select("*")
    .eq("status", "PENDING")
    .order("is_priority", { ascending: false })
    .order("submitted_at", { ascending: true });

  const rows = (requests ?? []) as VerificationRequestRow[];
  if (rows.length === 0) {
    return <AdminVerificationsList initialItems={[]} />;
  }

  const userIds = rows.map((r) => r.user_id);
  const [{ data: profiles }, { data: photos }] = await Promise.all([
    admin.from("profiles").select("*").in("id", userIds),
    admin.from("profile_photos").select("*").in("profile_id", userIds).order("position", { ascending: true })
  ]);

  // URLs signées (bucket privé verification-selfies) générées à la lecture,
  // jamais stockées telles quelles — même convention que message-attachments.
  const selfiePaths = rows.map((r) => r.selfie_storage_path).filter((p): p is string => Boolean(p));
  const selfieUrlByPath = new Map<string, string>();
  if (selfiePaths.length > 0) {
    const { data: signed } = await admin.storage.from("verification-selfies").createSignedUrls(selfiePaths, 3600);
    (signed ?? []).forEach((s) => {
      if (s.signedUrl && s.path) selfieUrlByPath.set(s.path, s.signedUrl);
    });
  }

  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));
  const photosByProfile = new Map<string, ProfilePhotoRow[]>();
  ((photos ?? []) as ProfilePhotoRow[]).forEach((p) => {
    const list = photosByProfile.get(p.profile_id) ?? [];
    list.push(p);
    photosByProfile.set(p.profile_id, list);
  });

  const items: AdminVerificationRow[] = rows
    .map((r) => {
      const profile = profileById.get(r.user_id);
      if (!profile) return null;
      return {
        requestId: r.id,
        userId: r.user_id,
        isPriority: r.is_priority,
        submittedAt: r.submitted_at,
        profile,
        photos: photosByProfile.get(r.user_id) ?? [],
        selfieUrl: r.selfie_storage_path ? (selfieUrlByPath.get(r.selfie_storage_path) ?? null) : null
      };
    })
    .filter((item): item is AdminVerificationRow => item !== null);

  return <AdminVerificationsList initialItems={items} />;
}
