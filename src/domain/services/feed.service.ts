import { FeedPublication, FeedCategory, FeedComment } from "../types/feed";
import { createClient } from "@/lib/supabase/client";
import { mapPostRowToFeedPublication, mapCommentRow, buildCommentTree } from "@/domain/mappers/feed.mapper";
import { uploadPostMedia, PLATFORM_MAX_UPLOAD_BYTES } from "@/lib/storage";
import type { PostRow, ProfileRow, PostCommentRow, PostMediaRow } from "@/lib/supabase/database.types";

export interface PersonalPublicationInput {
  title?: string;
  content: string;
  mediaFile?: File;
}

export interface IFeedService {
  getPublications(category?: FeedCategory): Promise<FeedPublication[]>;
  /** Pousse en temps réel toute nouvelle publication officielle (Realtime) — le fil n'attendait avant que le prochain rechargement manuel de la page. */
  subscribeToNewPosts(category: FeedCategory, onNewPost: (post: FeedPublication) => void): () => void;
  getPersonalPublications(profileId: string): Promise<FeedPublication[]>;
  createPersonalPublication(input: PersonalPublicationInput): Promise<FeedPublication>;
  updatePersonalPublication(id: string, input: PersonalPublicationInput & { removeMedia?: boolean }): Promise<FeedPublication>;
  deletePublication(id: string): Promise<void>;
  toggleLike(id: string): Promise<FeedPublication>;
  toggleBookmark(id: string): Promise<FeedPublication>;
  addComment(publicationId: string, content: string, parentCommentId?: string): Promise<FeedComment>;
  recordShare(id: string): Promise<void>;
}

class FeedServiceSupabase implements IFeedService {
  private async hydrate(rows: PostRow[]): Promise<FeedPublication[]> {
    if (rows.length === 0) return [];
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const postIds = rows.map((r) => r.id);
    const authorIds = [...new Set(rows.map((r) => r.author_id))];

    const [{ data: authors }, { data: media }, { data: comments }, { data: likes }, { data: bookmarks }] = await Promise.all([
      supabase.from("profiles").select("*").in("id", authorIds),
      supabase.from("post_media").select("*").in("post_id", postIds),
      supabase.from("post_comments").select("*").in("post_id", postIds).order("created_at", { ascending: false }),
      user ? supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] as { post_id: string }[] }),
      user
        ? supabase.from("post_bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds)
        : Promise.resolve({ data: [] as { post_id: string }[] })
    ]);

    const authorsById = new Map<string, ProfileRow>((authors ?? []).map((a: ProfileRow) => [a.id, a]));

    // Les commentaires peuvent être écrits par n'importe quel membre, pas seulement les
    // auteurs des posts déjà chargés ci-dessus — on complète la map avec les profils manquants.
    const missingCommentAuthorIds = [...new Set((comments ?? []).map((c: PostCommentRow) => c.author_id))].filter(
      (id) => !authorsById.has(id)
    );
    if (missingCommentAuthorIds.length > 0) {
      const { data: commentAuthors } = await supabase.from("profiles").select("*").in("id", missingCommentAuthorIds);
      (commentAuthors ?? []).forEach((a: ProfileRow) => authorsById.set(a.id, a));
    }

    const mediaByPost = new Map<string, PostMediaRow[]>();
    (media ?? []).forEach((m: PostMediaRow) => {
      const list = mediaByPost.get(m.post_id) ?? [];
      list.push(m);
      mediaByPost.set(m.post_id, list);
    });
    const commentRowsByPost = new Map<string, PostCommentRow[]>();
    (comments ?? []).forEach((c: PostCommentRow) => {
      const list = commentRowsByPost.get(c.post_id) ?? [];
      list.push(c);
      commentRowsByPost.set(c.post_id, list);
    });
    const likedSet = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
    const bookmarkedSet = new Set((bookmarks ?? []).map((b: { post_id: string }) => b.post_id));

    return rows.map((row) =>
      mapPostRowToFeedPublication(row, {
        author: authorsById.get(row.author_id),
        media: mediaByPost.get(row.id),
        comments: buildCommentTree(commentRowsByPost.get(row.id) ?? [], authorsById),
        hasLiked: likedSet.has(row.id),
        isBookmarked: bookmarkedSet.has(row.id)
      })
    );
  }

  async getPublications(category: FeedCategory = "ALL"): Promise<FeedPublication[]> {
    const supabase = createClient();

    // Les vidéos épinglées sont récupérées séparément (sans limite) pour
    // toujours apparaître en tête, même si elles sont plus anciennes que les
    // 30 dernières publications — puis placées avant le reste, trié par
    // pinned_position (ordre choisi par l'équipe éditoriale).
    let pinnedQuery = supabase
      .from("posts")
      .select("*")
      .eq("post_type", "OFFICIAL")
      .eq("is_pinned", true)
      .order("pinned_position", { ascending: true });
    let recentQuery = supabase
      .from("posts")
      .select("*")
      .eq("post_type", "OFFICIAL")
      .eq("is_pinned", false)
      .order("created_at", { ascending: false })
      .limit(30);

    if (category !== "ALL") {
      pinnedQuery = pinnedQuery.eq("category", category);
      recentQuery = recentQuery.eq("category", category);
    }

    const [{ data: pinned }, { data: recent }] = await Promise.all([pinnedQuery, recentQuery]);
    const combined = [...(pinned ?? []), ...(recent ?? [])] as PostRow[];
    if (combined.length === 0) return [];
    return this.hydrate(combined);
  }

  subscribeToNewPosts(category: FeedCategory, onNewPost: (post: FeedPublication) => void): () => void {
    const supabase = createClient();

    const channel = supabase
      .channel("feed:official-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts", filter: "post_type=eq.OFFICIAL" },
        async (payload) => {
          const row = payload.new as PostRow;
          if (category !== "ALL" && row.category !== category) return;
          const [hydrated] = await this.hydrate([row]);
          onNewPost(hydrated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async getPersonalPublications(profileId: string): Promise<FeedPublication[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("post_type", "PERSONAL")
      .eq("author_id", profileId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return this.hydrate(data as PostRow[]);
  }

  async createPersonalPublication({ content, title, mediaFile }: PersonalPublicationInput): Promise<FeedPublication> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");

    const { data, error } = await supabase
      .from("posts")
      .insert({ author_id: user.id, post_type: "PERSONAL", content, title: title || null, category: "QUOTE" })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "Impossible de publier.");
    const post = data as PostRow;

    if (mediaFile) {
      await this.attachMedia(post.id, user.id, mediaFile);
    }

    const { data: refreshed } = await supabase.from("posts").select("*").eq("id", post.id).single();
    const [hydrated] = await this.hydrate([(refreshed as PostRow) ?? post]);
    return hydrated;
  }

  async updatePersonalPublication(
    id: string,
    { content, title, mediaFile, removeMedia }: PersonalPublicationInput & { removeMedia?: boolean }
  ): Promise<FeedPublication> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");

    const { error } = await supabase.from("posts").update({ content, title: title || null }).eq("id", id);
    if (error) throw new Error(error.message);

    if (removeMedia) {
      await supabase.from("post_media").delete().eq("post_id", id);
      await supabase.from("posts").update({ media_type: "TEXT_ONLY", video_url: null, video_thumbnail: null }).eq("id", id);
    }

    if (mediaFile) {
      await supabase.from("post_media").delete().eq("post_id", id);
      await this.attachMedia(id, user.id, mediaFile);
    }

    const { data: refreshed } = await supabase.from("posts").select("*").eq("id", id).single();
    const [hydrated] = await this.hydrate([refreshed as PostRow]);
    return hydrated;
  }

  /** Upload réel vers post-media puis rattachement au post (image → post_media, vidéo → posts.video_url). */
  private async attachMedia(postId: string, userId: string, file: File): Promise<void> {
    const supabase = createClient();
    const { url, path } = await uploadPostMedia(userId, postId, file, PLATFORM_MAX_UPLOAD_BYTES);

    if (file.type.startsWith("video/")) {
      await supabase.from("posts").update({ media_type: "VIDEO", video_url: url }).eq("id", postId);
    } else {
      await supabase.from("posts").update({ media_type: "IMAGE" }).eq("id", postId);
      await supabase.from("post_media").insert({ post_id: postId, url, storage_path: path, position: 0 });
    }
  }

  async deletePublication(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async toggleLike(id: string): Promise<FeedPublication> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");

    const { data: existing } = await supabase.from("post_likes").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle();

    if (existing) {
      await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: id, user_id: user.id });
    }

    const { data: post } = await supabase.from("posts").select("*").eq("id", id).single();
    const [hydrated] = await this.hydrate([post as PostRow]);
    return hydrated;
  }

  async toggleBookmark(id: string): Promise<FeedPublication> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");

    const { data: existing } = await supabase
      .from("post_bookmarks")
      .select("post_id")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("post_bookmarks").delete().eq("post_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("post_bookmarks").insert({ post_id: id, user_id: user.id });
    }

    const { data: post } = await supabase.from("posts").select("*").eq("id", id).single();
    const [hydrated] = await this.hydrate([post as PostRow]);
    return hydrated;
  }

  async addComment(publicationId: string, content: string, parentCommentId?: string): Promise<FeedComment> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");

    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: publicationId, author_id: user.id, content, parent_comment_id: parentCommentId ?? null })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "Impossible de publier le commentaire.");

    const { data: author } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    return mapCommentRow(data as PostCommentRow, author as ProfileRow);
  }

  async recordShare(id: string): Promise<void> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("post_shares").insert({ post_id: id, user_id: user.id });
  }
}

export const feedService = new FeedServiceSupabase();
