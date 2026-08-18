import { createClient } from "@/lib/supabase/server";
import { AdminPostComposer } from "@/components/features/admin/admin-post-composer";

export default async function AdminPostsPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase.from("posts").select("*").eq("post_type", "OFFICIAL").order("created_at", { ascending: false });

  const postIds = (posts ?? []).map((p) => p.id);
  const { data: media } =
    postIds.length > 0
      ? await supabase.from("post_media").select("*").in("post_id", postIds)
      : { data: [] as { post_id: string; url: string }[] };

  const imageUrlByPost: Record<string, string> = {};
  (media ?? []).forEach((m) => {
    if (!imageUrlByPost[m.post_id]) imageUrlByPost[m.post_id] = m.url;
  });

  return (
    <div className="w-full">
      <AdminPostComposer initialPosts={posts ?? []} imageUrlByPost={imageUrlByPost} />
    </div>
  );
}
