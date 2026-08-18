"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FeedComment } from "@/domain/types/feed";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { useSession } from "@/core/providers/session-provider";
import { getInitials } from "@/domain/badges";
import { Send, CornerDownRight, X } from "lucide-react";

interface CommentSectionProps {
  publicationId: string;
  comments: FeedComment[];
  onAddComment: (content: string, parentCommentId?: string) => void;
}

export function CommentSection({
  comments,
  onAddComment
}: CommentSectionProps) {
  const { profile } = useSession();
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [openReplyForId, setOpenReplyForId] = useState<string | null>(null);
  const [replyTargetName, setReplyTargetName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newCommentText.trim());
      setNewCommentText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startReply = (parentId: string, authorName: string) => {
    setOpenReplyForId(parentId);
    setReplyTargetName(authorName);
    setReplyText("");
  };

  const cancelReply = () => {
    setOpenReplyForId(null);
    setReplyText("");
  };

  const handleSubmitReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      await onAddComment(replyText.trim(), parentId);
      setReplyText("");
      setOpenReplyForId(null);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const displayedComments = comments.slice(0, visibleCount);
  const hasMore = comments.length > visibleCount;

  return (
    <div className="space-y-4 pt-4 border-t border-border/40 select-none px-2">
      {/* Champ de saisie d'un nouveau commentaire */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        <Avatar
          size="sm"
          src={profile.avatar_url ?? undefined}
          fallback={getInitials(profile.first_name, profile.last_name)}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0 bg-secondary/50 border border-border/40 rounded-full pl-4 pr-1.5 py-1.5 flex items-center gap-1 focus-within:bg-card focus-within:ring-2 focus-within:ring-ring transition-all">
          <input
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Partager un mot d'encouragement..."
            className="flex-1 min-w-0 bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <EmojiPicker onSelect={(emoji) => setNewCommentText((prev) => prev + emoji)} />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            disabled={!newCommentText.trim() || isSubmitting}
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Send size={14} />
          </Button>
        </div>
      </form>

      {/* Liste des commentaires */}
      {comments.length === 0 ? (
        <div className="text-center py-4 text-xs text-muted-foreground bg-secondary/30 rounded-xl">
          Soyez le premier à partager une pensée ou une prière.
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {displayedComments.map((comment) => {
            const hasReplies = !!comment.replies && comment.replies.length > 0;
            const isReplyOpen = openReplyForId === comment.id;

            return (
              <div key={comment.id} className="space-y-2">
                <div className="flex items-start gap-2.5 group">
                  <Link href={`/profile/${comment.authorId}`} className="shrink-0">
                    <Avatar
                      size="sm"
                      src={comment.authorAvatar}
                      fallback={comment.authorName.charAt(0)}
                      isVerified={comment.isOfficialResponse}
                      className="hover:opacity-80 transition-opacity"
                    />
                  </Link>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="bg-secondary/40 border border-border/40 rounded-2xl p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/profile/${comment.authorId}`} className="font-semibold text-foreground hover:underline">
                            {comment.authorName}
                          </Link>
                          {comment.authorBadge && (
                            <Badge variant="verified" className="text-[9px] px-1.5 py-0">
                              {comment.authorBadge}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {comment.createdAt}
                        </span>
                      </div>
                      <p className="text-foreground/90 leading-relaxed font-normal">
                        {comment.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => (isReplyOpen ? cancelReply() : startReply(comment.id, comment.authorName))}
                      className="pl-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      Répondre
                    </button>
                  </div>
                </div>

                {/* Reponses Imbriquees + champ de réponse en bas du fil */}
                {(hasReplies || isReplyOpen) && (
                  <div className="pl-6 space-y-2 border-l-2 border-border/40 ml-4">
                    {comment.replies?.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-2.5">
                        <CornerDownRight size={14} className="text-muted-foreground shrink-0 mt-2" />
                        <Link href={`/profile/${reply.authorId}`} className="shrink-0">
                          <Avatar
                            size="sm"
                            src={reply.authorAvatar}
                            fallback={reply.authorName.charAt(0)}
                            isVerified={reply.isOfficialResponse}
                            className="hover:opacity-80 transition-opacity"
                          />
                        </Link>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="bg-card border border-border/60 rounded-2xl p-2.5 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Link href={`/profile/${reply.authorId}`} className="font-semibold text-foreground hover:underline">
                                  {reply.authorName}
                                </Link>
                                {reply.authorBadge && (
                                  <Badge variant="verified" className="text-[9px] px-1.5 py-0">
                                    {reply.authorBadge}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {reply.createdAt}
                              </span>
                            </div>
                            <p className="text-foreground/90 leading-relaxed font-normal">
                              {reply.content}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => (openReplyForId === comment.id ? cancelReply() : startReply(comment.id, reply.authorName))}
                            className="pl-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                          >
                            Répondre
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Champ de réponse, ancré en bas du commentaire (et de ses réponses) */}
                    {isReplyOpen && (
                      <form onSubmit={(e) => handleSubmitReply(e, comment.id)} className="flex items-center gap-2">
                        <Avatar
                          size="sm"
                          src={profile.avatar_url ?? undefined}
                          fallback={getInitials(profile.first_name, profile.last_name)}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0 bg-secondary/50 border border-border/40 rounded-full pl-4 pr-1.5 py-1.5 flex items-center gap-1 focus-within:bg-card focus-within:ring-2 focus-within:ring-ring transition-all">
                          <input
                            autoFocus
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Répondre à ${replyTargetName}...`}
                            className="flex-1 min-w-0 bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                          />
                          <EmojiPicker onSelect={(emoji) => setReplyText((prev) => prev + emoji)} />
                          <Button
                            type="submit"
                            size="icon"
                            variant="ghost"
                            disabled={!replyText.trim() || isSubmittingReply}
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            <Send size={14} />
                          </Button>
                        </div>
                        <button
                          type="button"
                          onClick={cancelReply}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-full transition-colors shrink-0"
                          title="Annuler"
                        >
                          <X size={14} />
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Bouton Affichage Progressif */}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((prev) => prev + 3)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground pl-1 pt-1 underline-offset-4 hover:underline"
            >
              Afficher plus de commentaires ({comments.length - visibleCount})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
