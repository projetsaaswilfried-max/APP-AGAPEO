import type { PostRow, PostCommentRow, PostMediaRow, ProfileRow } from "@/lib/supabase/database.types";
import type { FeedPublication, FeedComment, FeedCategory } from "@/domain/types/feed";
import { getProfileBadges } from "@/domain/badges";
import { resolvePhotoUrl } from "@/domain/mappers/profile.mapper";

/** Logo + cercle blanc pré-fusionnés (même image que le badge email) — avatar fixe de l'équipe, indépendant de qui a publié le post officiel. */
const AGAPE_TEAM_AVATAR_URL = "https://cfmrykzqxcjhpktuxopu.supabase.co/storage/v1/object/public/avatars/platform/agapeo-logo-email-badge.png";

const CATEGORY_LABELS: Record<string, string> = {
  TEACHING: "Enseignement",
  TESTIMONY: "Témoignage",
  WORKSHOP: "Atelier/Mariage",
  ADVICE: "Conseil",
  ANNOUNCEMENT: "Annonce",
  QUOTE: "Pensée & Citation",
  VERSE: "Verset",
  NEWS: "Nouveauté"
};

function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function mapCommentRow(row: PostCommentRow, author: ProfileRow | undefined): FeedComment {
  return {
    id: row.id,
    publicationId: row.post_id,
    authorId: row.author_id,
    authorName: author ? `${author.first_name} ${author.last_name}`.trim() : "Membre",
    authorAvatar: author?.avatar_url ? resolvePhotoUrl(author.avatar_url, author.id, author.is_photo_blurred, false) : "",
    authorBadge: author && getProfileBadges(author).length > 0 ? "Vérifié" : undefined,
    isOfficialResponse: author?.is_staff === true,
    content: row.content,
    createdAt: formatRelativeDate(row.created_at),
    likesCount: 0,
    parentCommentId: row.parent_comment_id ?? undefined
  };
}

/** Reconstruit l'arbre commentaires/réponses à partir des lignes brutes d'un post : les
 * commentaires racine gardent l'ordre de la requête (récents d'abord), leurs réponses sont
 * re-triées chronologiquement (plus anciennes d'abord) pour lire comme une conversation. */
export function buildCommentTree(rows: PostCommentRow[], authorsById: Map<string, ProfileRow>): FeedComment[] {
  const repliesByParent = new Map<string, PostCommentRow[]>();
  const topLevelRows: PostCommentRow[] = [];

  rows.forEach((row) => {
    if (row.parent_comment_id) {
      const list = repliesByParent.get(row.parent_comment_id) ?? [];
      list.push(row);
      repliesByParent.set(row.parent_comment_id, list);
    } else {
      topLevelRows.push(row);
    }
  });

  return topLevelRows.map((row) => {
    const comment = mapCommentRow(row, authorsById.get(row.author_id));
    const replyRows = (repliesByParent.get(row.id) ?? []).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    comment.replies = replyRows.map((r) => mapCommentRow(r, authorsById.get(r.author_id)));
    return comment;
  });
}

interface MapPostOptions {
  author?: ProfileRow;
  media?: PostMediaRow[];
  comments?: FeedComment[];
  hasLiked?: boolean;
  isBookmarked?: boolean;
}

export function mapPostRowToFeedPublication(row: PostRow, opts: MapPostOptions = {}): FeedPublication {
  const author = opts.author;
  const authorName = row.post_type === "OFFICIAL" ? "Équipe Agapeo" : author ? `${author.first_name} ${author.last_name}`.trim() : "Membre";
  const isVerified = row.post_type === "OFFICIAL" || (author ? getProfileBadges(author).some((b) => b.code === "VERIFIED_FAITH") : false);

  return {
    id: row.id,
    author: {
      id: row.author_id,
      name: authorName,
      role: row.post_type === "OFFICIAL" ? "Équipe éditoriale" : author?.profession || "Membre",
      avatarUrl:
        row.post_type === "OFFICIAL"
          ? AGAPE_TEAM_AVATAR_URL
          : author?.avatar_url
            ? resolvePhotoUrl(author.avatar_url, author.id, author.is_photo_blurred, false)
            : "",
      isOfficialTeam: row.post_type === "OFFICIAL",
      isVerified,
      badgeLabel: row.post_type === "OFFICIAL" ? "Officiel" : "Membre"
    },
    title: row.title ?? undefined,
    content: row.content,
    category: (row.category as FeedCategory) ?? "QUOTE",
    categoryLabel: row.category ? CATEGORY_LABELS[row.category] ?? row.category : "Pensée",
    isPinned: row.is_pinned,
    mediaType: row.media_type === "TEXT_ONLY" ? undefined : row.media_type,
    images: opts.media?.map((m) => ({ id: m.id, url: m.url, isPrimary: false })),
    videoUrl: row.video_url ?? undefined,
    videoThumbnail: row.video_thumbnail ?? undefined,
    quoteText: row.quote_text ?? undefined,
    quoteAuthor: row.quote_author ?? undefined,
    reactionsCount: row.likes_count,
    commentsCount: row.comments_count,
    sharesCount: row.shares_count,
    hasLiked: opts.hasLiked ?? false,
    isBookmarked: opts.isBookmarked ?? false,
    createdAt: formatRelativeDate(row.created_at),
    comments: opts.comments ?? []
  };
}
