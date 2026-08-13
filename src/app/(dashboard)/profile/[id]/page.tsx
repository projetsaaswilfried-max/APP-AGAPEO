import { redirect } from "next/navigation";
import { requireSession } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";
import { mapProfileRowToUserProfile } from "@/domain/mappers/profile.mapper";
import { mapPostRowToFeedPublication } from "@/domain/mappers/feed.mapper";
import { computeCompatibility } from "@/domain/matching/compatibility";
import { PublicProfileClient } from "@/components/features/profile/public-profile-client";
import { EmptyState } from "@/components/ui/empty-state";
import { UserX } from "lucide-react";
import type { ProfileRow, PostRow, PostMediaRow } from "@/lib/supabase/database.types";

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile: viewerRow } = await requireSession();

  if (id === user.id) {
    redirect("/profile");
  }

  const supabase = await createClient();

  const { data: targetRow } = await supabase.from("profiles").select("*").eq("id", id).single();

  if (!targetRow) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <EmptyState
          icon={<UserX size={24} />}
          title="Profil introuvable"
          description="Ce profil n'existe pas, a été supprimé, ou n'est plus accessible."
        />
      </div>
    );
  }

  const target = targetRow as ProfileRow;

  const [{ data: photos }, { data: posts }, { data: favoriteRow }] = await Promise.all([
    supabase.from("profile_photos").select("*").eq("profile_id", target.id).order("position", { ascending: true }),
    supabase.from("posts").select("*").eq("post_type", "PERSONAL").eq("author_id", target.id).order("created_at", { ascending: false }),
    supabase.from("favorites").select("id").eq("user_id", user.id).eq("favorite_profile_id", target.id).maybeSingle()
  ]);

  const postRows = (posts ?? []) as PostRow[];
  let media: PostMediaRow[] = [];
  if (postRows.length > 0) {
    const { data: mediaRows } = await supabase
      .from("post_media")
      .select("*")
      .in(
        "post_id",
        postRows.map((p) => p.id)
      );
    media = (mediaRows ?? []) as PostMediaRow[];
  }
  const mediaByPost = new Map<string, PostMediaRow[]>();
  media.forEach((m) => {
    const list = mediaByPost.get(m.post_id) ?? [];
    list.push(m);
    mediaByPost.set(m.post_id, list);
  });
  const personalPublications = postRows.map((row) =>
    mapPostRowToFeedPublication(row, { author: target, media: mediaByPost.get(row.id) })
  );

  const { score, reasons } = computeCompatibility(viewerRow, target);
  const profile = mapProfileRowToUserProfile(target, photos ?? [], {
    compatibilityPercentage: score,
    compatibilityReasons: reasons
  });

  return (
    <PublicProfileClient
      profile={profile}
      personalPublications={personalPublications}
      compatibilityPercentage={score}
      compatibilityReasons={reasons}
      isFavorite={Boolean(favoriteRow)}
    />
  );
}
