import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";
import { mapProfileRowToUserProfile } from "@/domain/mappers/profile.mapper";
import { mapPostRowToFeedPublication } from "@/domain/mappers/feed.mapper";
import { computeCompatibility } from "@/domain/matching/compatibility";
import { PublicProfileClient } from "@/components/features/profile/public-profile-client";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { UserX, Crown, ShieldAlert } from "lucide-react";
import type { ProfileRow, PostRow, PostMediaRow } from "@/lib/supabase/database.types";

const MONTHLY_VIEW_LIMIT = 10;

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile: viewerRow } = await requireSession();

  if (id === user.id) {
    redirect("/profile");
  }

  const supabase = await createClient();

  // Un membre qui n'a pas encore fait valider son profil peut voir un aperçu
  // des membres dans Découvrir (photos floutées) mais pas consulter une
  // fiche complète — même en connaissant l'URL directe.
  const isViewerVerified = viewerRow.photo_verification_status === "VERIFIED" || viewerRow.role !== "USER";
  if (!isViewerVerified) {
    return (
      <div className="max-w-md mx-auto py-16">
        <EmptyState
          icon={<ShieldAlert size={24} />}
          title="Valide ton profil pour consulter cette fiche"
          description="Tu peux découvrir un aperçu des membres depuis Découvrir, mais il faut d'abord faire valider ton profil pour en consulter une fiche complète."
          action={
            <Link href="/profile?tab=account">
              <Button variant="primary" size="sm" leftIcon={<ShieldAlert size={15} />}>
                Vérifier mon profil
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isPremiumViewer = viewerRow.subscription_status === "ACTIVE" || viewerRow.role !== "USER";
  if (!isPremiumViewer) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: viewedRows } = await supabase
      .from("profile_views")
      .select("viewed_profile_id")
      .eq("viewer_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    const distinctViewedIds = new Set((viewedRows ?? []).map((r) => r.viewed_profile_id));
    const alreadyViewedThisProfile = distinctViewedIds.has(id);

    if (!alreadyViewedThisProfile && distinctViewedIds.size >= MONTHLY_VIEW_LIMIT) {
      return (
        <div className="max-w-md mx-auto py-16">
          <EmptyState
            icon={<Crown size={24} />}
            title={`Tu as consulté ${MONTHLY_VIEW_LIMIT} profils ce mois-ci`}
            description="Passe Premium pour consulter des profils sans limite."
            action={
              <Link href="/premium">
                <Button variant="primary" size="sm" leftIcon={<Crown size={15} />}>
                  Découvrir Premium
                </Button>
              </Link>
            }
          />
        </div>
      );
    }
  }

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

  // Un profil en cours d'examen ou dont la photo a été refusée ne doit
  // jamais être accessible aux autres membres (cohérent avec le filtre
  // appliqué dans Découvrir) — même en connaissant l'URL directe. L'équipe
  // (staff) reste exemptée pour pouvoir modérer/consulter ces profils.
  const isStaffViewer = viewerRow.role !== "USER";
  if (!isStaffViewer && (target.photo_verification_status === "PENDING" || target.photo_verification_status === "REJECTED")) {
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
