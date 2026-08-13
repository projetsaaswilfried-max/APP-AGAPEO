import { createClient } from "@/lib/supabase/server";
import { AdminPostComposer } from "@/components/features/admin/admin-post-composer";

export default async function AdminPostsPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase.from("posts").select("*").eq("post_type", "OFFICIAL").order("created_at", { ascending: false });

  return (
    <div className="w-full">
      <AdminPostComposer initialPosts={posts ?? []} />
    </div>
  );
}
