"use client";

import { useState } from "react";
import { FeedPublication } from "@/domain/types/feed";
import { feedService } from "@/domain/services/feed.service";
import { PublicationCard } from "@/components/features/feed/publication-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PublicationComposerModal } from "@/components/features/profile/publication-composer-modal";
import { Tooltip } from "@/components/ui/tooltip";
import { BookOpen, Plus, Pencil, Trash2, Info } from "lucide-react";

interface UserPublicationsSectionProps {
  userName: string;
  publications: FeedPublication[];
  isOwner?: boolean;
}

export function UserPublicationsSection({ userName, publications, isOwner = false }: UserPublicationsSectionProps) {
  const [items, setItems] = useState<FeedPublication[]>(publications);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPublication | null>(null);

  const openCreate = () => {
    setEditingPost(null);
    setIsComposerOpen(true);
  };

  const openEdit = (post: FeedPublication) => {
    setEditingPost(post);
    setIsComposerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette publication ?")) return;
    setItems((prev) => prev.filter((p) => p.id !== id));
    await feedService.deletePublication(id);
  };

  const handleLikeToggle = async (id: string) => {
    setItems((prev) => prev.map((pub) => (pub.id === id ? { ...pub, hasLiked: !pub.hasLiked, reactionsCount: pub.reactionsCount + (pub.hasLiked ? -1 : 1) } : pub)));
    await feedService.toggleLike(id);
  };

  const handleBookmarkToggle = async (id: string) => {
    setItems((prev) => prev.map((pub) => (pub.id === id ? { ...pub, isBookmarked: !pub.isBookmarked } : pub)));
    await feedService.toggleBookmark(id);
  };

  const handleAddComment = async (publicationId: string, text: string, parentCommentId?: string) => {
    const newComment = await feedService.addComment(publicationId, text, parentCommentId);
    setItems((prev) =>
      prev.map((pub) => {
        if (pub.id !== publicationId) return pub;
        if (!parentCommentId) {
          return { ...pub, commentsCount: pub.commentsCount + 1, comments: [newComment, ...pub.comments] };
        }
        return {
          ...pub,
          commentsCount: pub.commentsCount + 1,
          comments: pub.comments.map((c) => (c.id === parentCommentId ? { ...c, replies: [...(c.replies ?? []), newComment] } : c))
        };
      })
    );
  };

  return (
    <div className="space-y-6 select-none w-full">
      <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/60 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-display font-semibold text-foreground">Pensées & Publications de {userName}</h3>
          <Tooltip content="Les publications que vous créez seront vues uniquement par les personnes qui viendront consulter votre profil — elles n'apparaissent jamais dans le fil général.">
            <Info size={13} className="text-muted-foreground hover:text-foreground transition-colors cursor-help" />
          </Tooltip>
        </div>

        {isOwner && (
          <Button variant="primary" size="sm" onClick={openCreate} leftIcon={<Plus size={15} />}>
            Créer une publication
          </Button>
        )}
      </div>

      {!items || items.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} />}
          title={`${userName} n'a pas encore partagé de pensée personnelle`}
          description="Les publications personnelles de ce membre apparaîtront ici."
          action={
            isOwner ? (
              <Button variant="primary" size="sm" onClick={openCreate}>
                Publier ma première pensée
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {items.map((pub) => (
            <div key={pub.id}>
              <PublicationCard publication={pub} onLikeToggle={handleLikeToggle} onBookmarkToggle={handleBookmarkToggle} onAddComment={handleAddComment} />
              {isOwner && (
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(pub)} leftIcon={<Pencil size={13} />}>
                    Modifier
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(pub.id)} leftIcon={<Trash2 size={14} />}>
                    Supprimer
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <PublicationComposerModal
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          editingPublication={editingPost}
          onCreated={(pub) => setItems((prev) => [pub, ...prev])}
          onUpdated={(pub) => setItems((prev) => prev.map((p) => (p.id === pub.id ? pub : p)))}
        />
      )}
    </div>
  );
}
