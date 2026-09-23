"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FeedComment } from "@/domain/types/feed";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { useSession } from "@/core/providers/session-provider";
import { getInitials } from "@/domain/badges";
import { linkifyText } from "@/lib/linkify";
import { Send, CornerDownRight, X, Check } from "lucide-react";

interface CommentSectionProps {
  publicationId: string;
  /** Sert à autoriser le propriétaire du post à supprimer (jamais modifier) un commentaire, même si ce n'est pas le sien — même règle que la RLS `post_comments_delete`. */
  postAuthorId: string;
  comments: FeedComment[];
  onAddComment: (content: string, parentCommentId?: string) => void;
  onUpdateComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export function CommentSection({
  postAuthorId,
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment
}: CommentSectionProps) {
  const { profile } = useSession();
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  // Replie les réponses par défaut (stratégie Facebook) : afficher tout d'un
  // coup mélangeait visuellement commentaires et réponses, ce qui était
  // remonté comme confus. Un commentaire donné ne réapparaît dans cet
  // ensemble que si la personne clique explicitement sur "Voir les
  // réponses" — retirer son id l'y remet à l'état replié initial.
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<string>>(new Set());
  const [openReplyForId, setOpenReplyForId] = useState<string | null>(null);
  const [replyTargetName, setReplyTargetName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

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

  const toggleReplies = (commentId: string) => {
    setExpandedReplyIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  /** Répondre à un commentaire déplié automatiquement ses réponses existantes — sinon la personne composerait une réponse sans voir celles déjà là. */
  const startReply = (parentId: string, authorName: string) => {
    setEditingCommentId(null);
    setOpenReplyForId(parentId);
    setReplyTargetName(authorName);
    setReplyText("");
    setExpandedReplyIds((prev) => new Set(prev).add(parentId));
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

  // Réservé au véritable auteur (jamais le propriétaire du post ni l'équipe) —
  // supprimer relève de la modération, réécrire les mots de quelqu'un d'autre non.
  const canEditComment = (comment: FeedComment) => comment.authorId === profile.id;
  // Auteur, propriétaire du post, ou équipe — même règle que la RLS `post_comments_delete`.
  const canDeleteComment = (comment: FeedComment) =>
    comment.authorId === profile.id || postAuthorId === profile.id || profile.is_staff;

  const startEdit = (comment: FeedComment) => {
    setOpenReplyForId(null);
    setEditingCommentId(comment.id);
    setEditText(comment.content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const handleSubmitEdit = (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    const trimmed = editText.trim();
    if (!trimmed) return;
    onUpdateComment(commentId, trimmed);
    setEditingCommentId(null);
    setEditText("");
  };

  const handleDelete = (comment: FeedComment) => {
    const message =
      comment.replies && comment.replies.length > 0
        ? "Supprimer ce commentaire ? Les réponses associées seront aussi supprimées."
        : "Supprimer ce commentaire ?";
    if (!window.confirm(message)) return;
    onDeleteComment(comment.id);
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
            const isRepliesExpanded = expandedReplyIds.has(comment.id);
            const replyCount = comment.replies?.length ?? 0;
            const isEditingThis = editingCommentId === comment.id;

            return (
              <div key={comment.id} className="space-y-2">
                <div className="flex items-start gap-2.5 group">
                  <Link href={`/profile/${comment.authorId}`} className="shrink-0">
                    <Avatar
                      size="sm"
                      src={comment.authorAvatar}
                      fallback={comment.authorName.charAt(0)}
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
                          {/* Équipe Agapeo (SUPER_ADMIN/ADMIN/MODERATOR) : même badge bleu que le fil officiel, jamais le badge "Vérifié" générique. */}
                          {comment.isOfficialResponse ? (
                            <VerifiedBadge size="xs" color="blue" ring={false} title="Compte officiel Agapeo" />
                          ) : (
                            comment.authorBadge && (
                              <Badge variant="verified" className="text-[9px] px-1.5 py-0">
                                {comment.authorBadge}
                              </Badge>
                            )
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {comment.createdAt}
                          {comment.isEdited && " · modifié"}
                        </span>
                      </div>
                      {isEditingThis ? (
                        <form onSubmit={(e) => handleSubmitEdit(e, comment.id)} className="space-y-1.5 pt-0.5">
                          <input
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <div className="flex items-center gap-3">
                            <button
                              type="submit"
                              disabled={!editText.trim()}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-40"
                            >
                              <Check size={12} /> Enregistrer
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                            >
                              Annuler
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="text-foreground/90 leading-relaxed font-normal break-words">
                          {linkifyText(comment.content)}
                        </p>
                      )}
                    </div>
                    {!isEditingThis && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => (isReplyOpen ? cancelReply() : startReply(comment.id, comment.authorName))}
                          className="pl-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          Répondre
                        </button>
                        {canEditComment(comment) && (
                          <button
                            type="button"
                            onClick={() => startEdit(comment)}
                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                          >
                            Modifier
                          </button>
                        )}
                        {canDeleteComment(comment) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(comment)}
                            className="text-[11px] font-medium text-muted-foreground hover:text-destructive"
                          >
                            Supprimer
                          </button>
                        )}
                        {/* Repliées par défaut façon Facebook : évite de mélanger commentaires et réponses d'un coup d'œil. */}
                        {hasReplies && !isRepliesExpanded && (
                          <button
                            type="button"
                            onClick={() => toggleReplies(comment.id)}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
                          >
                            <span className="inline-block w-4 h-px bg-border" />
                            Voir {replyCount === 1 ? "1 réponse" : `les ${replyCount} réponses`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reponses Imbriquees + champ de réponse en bas du fil */}
                {(isRepliesExpanded || isReplyOpen) && (
                  <div className="pl-6 space-y-2 border-l-2 border-border/40 ml-4">
                    {isRepliesExpanded &&
                      comment.replies?.map((reply) => {
                        const isEditingReply = editingCommentId === reply.id;
                        return (
                          <div key={reply.id} className="flex items-start gap-2.5">
                            <CornerDownRight size={14} className="text-muted-foreground shrink-0 mt-2" />
                            <Link href={`/profile/${reply.authorId}`} className="shrink-0">
                              <Avatar
                                size="sm"
                                src={reply.authorAvatar}
                                fallback={reply.authorName.charAt(0)}
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
                                    {reply.isOfficialResponse ? (
                                      <VerifiedBadge size="xs" color="blue" ring={false} title="Compte officiel Agapeo" />
                                    ) : (
                                      reply.authorBadge && (
                                        <Badge variant="verified" className="text-[9px] px-1.5 py-0">
                                          {reply.authorBadge}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {reply.createdAt}
                                    {reply.isEdited && " · modifié"}
                                  </span>
                                </div>
                                {isEditingReply ? (
                                  <form onSubmit={(e) => handleSubmitEdit(e, reply.id)} className="space-y-1.5 pt-0.5">
                                    <input
                                      autoFocus
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="submit"
                                        disabled={!editText.trim()}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-40"
                                      >
                                        <Check size={12} /> Enregistrer
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                      >
                                        Annuler
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <p className="text-foreground/90 leading-relaxed font-normal break-words">
                                    {linkifyText(reply.content)}
                                  </p>
                                )}
                              </div>
                              {!isEditingReply && (
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => (openReplyForId === comment.id ? cancelReply() : startReply(comment.id, reply.authorName))}
                                    className="pl-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                  >
                                    Répondre
                                  </button>
                                  {canEditComment(reply) && (
                                    <button
                                      type="button"
                                      onClick={() => startEdit(reply)}
                                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                    >
                                      Modifier
                                    </button>
                                  )}
                                  {canDeleteComment(reply) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(reply)}
                                      className="text-[11px] font-medium text-muted-foreground hover:text-destructive"
                                    >
                                      Supprimer
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {/* Repasse à l'état initial (replié) — la personne retrouve exactement l'affichage compact d'origine. */}
                    {hasReplies && isRepliesExpanded && (
                      <button
                        type="button"
                        onClick={() => toggleReplies(comment.id)}
                        className="pl-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
                      >
                        <span className="inline-block w-4 h-px bg-border" />
                        Masquer les réponses
                      </button>
                    )}

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
