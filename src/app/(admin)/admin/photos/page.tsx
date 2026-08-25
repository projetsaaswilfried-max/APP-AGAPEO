import { createAdminClient } from "@/lib/supabase/admin";
import { AdminPhotosList, type AdminPhotoRow } from "@/components/features/admin/admin-photos-list";
import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";

export default async function AdminPhotosPage() {
  const admin = createAdminClient();

  const { data: photos } = await admin
    .from("profile_photos")
    .select("*")
    .eq("moderation_status", "PENDING")
    .order("created_at", { ascending: true });

  const rows = (photos ?? []) as ProfilePhotoRow[];
  if (rows.length === 0) {
    return <AdminPhotosList initialItems={[]} />;
  }

  const userIds = [...new Set(rows.map((r) => r.profile_id))];
  const { data: profiles } = await admin.from("profiles").select("*").in("id", userIds);
  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));

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
        profile
      };
    })
    .filter((item): item is AdminPhotoRow => item !== null);

  return <AdminPhotosList initialItems={items} />;
}
