"use client";

import React, { useState } from "react";
import { FeedPublication } from "@/domain/types/feed";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaGallery } from "@/components/ui/media-gallery";
import { YouTubePlayer } from "@/components/ui/youtube-player";
import { CommentSection } from "./comment-section";
import { ReportModal } from "@/components/features/moderation/report-modal";
import { feedService } from "@/domain/services/feed.service";
import { linkifyText } from "@/lib/linkify";
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  MoreHorizontal,
  Quote,
  Copy,
  Flag
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicationCardProps {
  publication: FeedPublication;
  onLikeToggle: (id: string) => void;
  onBookmarkToggle: (id: string) => void;
  onAddComment: (id: string, content: string) => void;
}

export function PublicationCard({
  publication,
  onLikeToggle,
  onBookmarkToggle,
  onAddComment
}: PublicationCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
    void feedService.recordShare(publication.id);
  };

  return (
    <Card variant="base" className="overflow-hidden select-none transition-all">
      {/* En-tête de publication : Auteur officiel, Badge, Date, Menu */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-4">
        <div className="flex items-center gap-3">
          <Avatar
            size="md"
            src={publication.author.avatarUrl}
            fallback="AG"
            isVerified={publication.author.isVerified}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground tracking-tight">
                {publication.author.name}
              </span>
              {publication.author.isOfficialTeam && (
                <Badge variant="verified" className="text-[10px] px-2 py-0">
                  {publication.author.badgeLabel}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{publication.createdAt}</span>
              <span>•</span>
              <span className="font-medium text-foreground/80">{publication.categoryLabel}</span>
            </div>
          </div>
        </div>

        {/* Dropdown Menu Contextuel */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            title="Options"
          >
            <MoreHorizontal size={18} />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-48 p-1 bg-card border border-border rounded-xl shadow-xl z-40 text-xs animate-in fade-in duration-150">
                <button
                  onClick={() => {
                    handleShare();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  <Copy size={14} className="text-muted-foreground" />
                  <span>Copier le lien</span>
                </button>
                <button
                  onClick={() => {
                    setIsReportOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Flag size={14} />
                  <span>Signaler le contenu</span>
                </button>
              </div>
            </>
          )}
        </div>
      </CardHeader>

      {shareCopied && (
        <div className="mx-5 mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-700 dark:text-emerald-400">
          Lien copié dans le presse-papier.
        </div>
      )}

      {/* Contenu Textuel de la Publication */}
      <CardContent className="px-5 py-2 space-y-4">
        {publication.title && (
          <h2 className="text-lg font-display font-bold tracking-tight text-foreground leading-snug">
            {publication.title}
          </h2>
        )}

        {/* Citation Formatée en Display */}
        {publication.mediaType === "QUOTE_CARD" ? (
          <div className="p-6 rounded-2xl bg-secondary/50 border border-border/60 relative space-y-3">
            <Quote size={28} className="text-accent/60" />
            <p className="font-display text-base md:text-lg italic text-foreground leading-relaxed">
              &ldquo;{publication.quoteText || publication.content}&rdquo;
            </p>
            {publication.quoteAuthor && (
              <p className="text-xs font-medium text-muted-foreground text-right">
                — {publication.quoteAuthor}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {linkifyText(publication.content)}
          </p>
        )}

        {/* Médias : Image unique, Galerie Photo, ou Vidéo */}
        {publication.mediaType === "IMAGE" && publication.images && publication.images[0] && (
          <div className="rounded-2xl overflow-hidden border border-border/60 shadow-2xs bg-secondary flex items-center justify-center max-h-[32rem]">
            <img
              src={publication.images[0].url}
              alt="Illustration"
              className="w-full h-auto max-h-[32rem] object-contain"
            />
          </div>
        )}

        {publication.mediaType === "GALLERY" && publication.images && (
          <MediaGallery photos={publication.images} />
        )}

        {publication.mediaType === "VIDEO" && publication.videoUrl && (
          <div className="rounded-2xl overflow-hidden border border-border/60 shadow-2xs bg-black">
            {/* controlsList="nodownload" + blocage du clic droit retirent le
                bouton de téléchargement natif et le "Enregistrer la vidéo
                sous..." du menu contextuel — un frein pour un visiteur
                occasionnel, pas une protection DRM réelle : l'URL du fichier
                reste publique (bucket post-media public en lecture). */}
            <video
              src={publication.videoUrl}
              poster={publication.videoThumbnail}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              preload="metadata"
              className="w-full max-h-[32rem]"
            />
          </div>
        )}

        {publication.mediaType === "YOUTUBE" && publication.videoUrl && (
          <div className="rounded-2xl overflow-hidden border border-border/60 shadow-2xs">
            <YouTubePlayer videoId={publication.videoUrl} thumbnailUrl={publication.videoThumbnail} />
          </div>
        )}
      </CardContent>

      {/* Barre d'Actions & Compteurs */}
      <CardFooter className="px-5 py-3 border-t border-border/40 flex flex-col space-y-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Bouton Like / J'aime */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLikeToggle(publication.id)}
              className={cn(
                "gap-1.5 text-xs font-medium",
                publication.hasLiked
                  ? "text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart
                size={16}
                className={cn(publication.hasLiked && "fill-current")}
              />
              <span>{publication.reactionsCount}</span>
            </Button>

            {/* Bouton Commentaires */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <MessageSquare size={16} />
              <span>{publication.commentsCount}</span>
            </Button>

            {/* Bouton Partager */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">{publication.sharesCount}</span>
            </Button>
          </div>

          {/* Bouton Enregistrer (Bookmark) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onBookmarkToggle(publication.id)}
            className={cn(
              "h-8 w-8",
              publication.isBookmarked
                ? "text-accent hover:text-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={publication.isBookmarked ? "Enregistré" : "Enregistrer"}
          >
            <Bookmark
              size={16}
              className={cn(publication.isBookmarked && "fill-current")}
            />
          </Button>
        </div>

        {/* Section Commentaires dépliante */}
        {showComments && (
          <CommentSection
            publicationId={publication.id}
            comments={publication.comments}
            onAddComment={(content) => onAddComment(publication.id, content)}
          />
        )}
      </CardFooter>

      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} targetType="POST" targetId={publication.id} />
    </Card>
  );
}
