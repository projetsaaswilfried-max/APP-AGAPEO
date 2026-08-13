import type { PostRow, PostCommentRow, PostMediaRow, ProfileRow } from "@/lib/supabase/database.types";
import type { FeedPublication, FeedComment, FeedCategory } from "@/domain/types/feed";
import { getProfileBadges } from "@/domain/badges";

const CATEGORY_LABELS: Record<string, string> = {
  TEACHING: "Enseignement",
  TESTIMONY: "Témoignage",
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
    authorAvatar: author?.avatar_url ?? "",
    authorBadge: author && getProfileBadges(author).length > 0 ? "Vérifié" : undefined,
    isOfficialResponse: author?.is_staff === true,
    content: row.content,
    createdAt: formatRelativeDate(row.created_at),
    likesCount: 0
  };
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
  const authorName = row.post_type === "OFFICIAL" ? "Équipe Agape" : author ? `${author.first_name} ${author.last_name}`.trim() : "Membre";
  const isVerified = row.post_type === "OFFICIAL" || (author ? getProfileBadges(author).some((b) => b.code === "VERIFIED_FAITH") : false);

  return {
    id: row.id,
    author: {
      id: row.author_id,
      name: authorName,
      role: row.post_type === "OFFICIAL" ? "Équipe éditoriale" : author?.profession || "Membre",
      avatarUrl: author?.avatar_url ?? "",
      isOfficialTeam: row.post_type === "OFFICIAL",
      isVerified,
      badgeLabel: row.post_type === "OFFICIAL" ? "Officiel" : "Membre"
    },
    title: row.title ?? undefined,
    content: row.content,
    category: (row.category as FeedCategory) ?? "QUOTE",
    categoryLabel: row.category ? CATEGORY_LABELS[row.category] ?? row.category : "Pensée",
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
