"use client";

import { useState } from "react";
import { FeedPublication } from "@/domain/types/feed";
import { feedService } from "@/domain/services/feed.service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicationCard } from "@/components/features/feed/publication-card";
import { PublicationComposerModal } from "@/components/features/profile/publication-composer-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";
import { Plus, BookOpen, Trash2, Pencil, Info } from "lucide-react";

interface AccountMyPostsProps {
  publications: FeedPublication[];
}

export function AccountMyPosts({ publications }: AccountMyPostsProps) {
  const [posts, setPosts] = useState<FeedPublication[]>(publications);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPublication | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette publication ?")) return;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    await feedService.deletePublication(id);
  };

  const handleLikeToggle = async (id: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, hasLiked: !p.hasLiked, reactionsCount: p.reactionsCount + (p.hasLiked ? -1 : 1) } : p)));
    await feedService.toggleLike(id);
  };

  const handleAddComment = async (publicationId: string, text: string) => {
    const newComment = await feedService.addComment(publicationId, text);
    setPosts((prev) =>
      prev.map((p) => (p.id === publicationId ? { ...p, commentsCount: p.commentsCount + 1, comments: [newComment, ...p.comments] } : p))
    );
  };

  const openCreate = () => {
    setEditingPost(null);
    setIsComposerOpen(true);
  };

  const openEdit = (post: FeedPublication) => {
    setEditingPost(post);
    setIsComposerOpen(true);
  };

  return (
    <div className="space-y-6 select-none">
      <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
              Gestion de mes Publications Personnelles
            </h2>
            <Tooltip content="Les publications que vous créez seront vues uniquement par les personnes qui viendront consulter votre profil — elles n'apparaissent jamais dans le fil général.">
              <Info size={15} className="text-muted-foreground hover:text-foreground transition-colors cursor-help" />
            </Tooltip>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate} leftIcon={<Plus size={16} />} className="shrink-0">
            Créer une publication
          </Button>
        </div>

        {posts.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={24} />}
            title="Tu n'as créé aucune publication"
            description="Partage une pensée spirituelle ou une citation pour enrichir ton profil."
            action={
              <Button variant="primary" size="sm" onClick={openCreate}>
                Créer ma première publication
              </Button>
            }
          />
        ) : (
          <div className="space-y-6 w-full">
            {posts.map((pub) => (
              <div key={pub.id} className="relative group">
                <PublicationCard publication={pub} onLikeToggle={handleLikeToggle} onBookmarkToggle={() => {}} onAddComment={handleAddComment} />
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(pub)} leftIcon={<Pencil size={13} />}>
                    Modifier
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(pub.id)} leftIcon={<Trash2 size={14} />}>
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <PublicationComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        editingPublication={editingPost}
        onCreated={(pub) => setPosts((prev) => [pub, ...prev])}
        onUpdated={(pub) => setPosts((prev) => prev.map((p) => (p.id === pub.id ? pub : p)))}
      />
    </div>
  );
}
