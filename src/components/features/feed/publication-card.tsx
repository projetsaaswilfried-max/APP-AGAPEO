"use client";

import React, { useEffect, useRef, useState } from "react";
import { FeedPublication } from "@/domain/types/feed";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Button } from "@/components/ui/button";
import { MediaGallery } from "@/components/ui/media-gallery";
import { YouTubePlayer } from "@/components/ui/youtube-player";
import { CommentSection } from "./comment-section";
import { ReportModal } from "@/components/features/moderation/report-modal";
import { feedService } from "@/domain/services/feed.service";
import { linkifyText } from "@/lib/linkify";
import { FacebookIcon, WhatsappIcon, TelegramIcon } from "@/components/ui/social-icons";
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  MoreHorizontal,
  Quote,
  Copy,
  Flag,
  Pin,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicationCardProps {
  publication: FeedPublication;
  onLikeToggle: (id: string) => void;
  onBookmarkToggle: (id: string) => void;
  onAddComment: (id: string, content: string, parentCommentId?: string) => void;
  /** Chemin de la page où cette publication est affichée (`/feed`, `/profile`, `/profile/{id}`) — sert à construire un lien de partage qui pointe vraiment vers ce post, pas juste vers la page courante. */
  sharePath: string;
}

interface OptionsMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onCopyLink: () => void;
  onReport: () => void;
}

function OptionsMenu({ isOpen, onToggle, onClose, onCopyLink, onReport }: OptionsMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
        title="Options"
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={onClose} />
          <div className="absolute right-0 mt-1 w-48 p-1 bg-card border border-border rounded-xl shadow-xl z-40 text-xs animate-in fade-in duration-150">
            <button
              onClick={onCopyLink}
              className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <Copy size={14} className="text-muted-foreground" />
              <span>Copier le lien</span>
            </button>
            <button
              onClick={onReport}
              className="w-full flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Flag size={14} />
              <span>Signaler le contenu</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface ShareMenuProps {
  shareText: string;
  shareUrl: string;
  sharesCount: number;
  onCopyLink: () => void;
  onPlatformShare: () => void;
}

function ShareMenu({ shareText, shareUrl, sharesCount, onCopyLink, onPlatformShare }: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openShareWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
    onPlatformShare();
    setIsOpen(false);
  };

  const shareOnFacebook = () => {
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
  };

  const shareOnWhatsapp = () => {
    openShareWindow(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`);
  };

  const shareOnTelegram = () => {
    openShareWindow(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((open) => !open)}
        className="gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <Share2 size={16} />
        <span className="hidden sm:inline">{sharesCount}</span>
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 bottom-full mb-1 w-56 p-1 bg-card border border-border rounded-xl shadow-xl z-40 text-xs animate-in fade-in duration-150">
            <button
              onClick={shareOnFacebook}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <FacebookIcon size={15} className="text-[#1877F2] shrink-0" />
              <span>Partager sur Facebook</span>
            </button>
            <button
              onClick={shareOnWhatsapp}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <WhatsappIcon size={15} className="text-[#25D366] shrink-0" />
              <span>Partager sur WhatsApp</span>
            </button>
            <button
              onClick={shareOnTelegram}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <TelegramIcon size={15} className="text-[#26A5E4] shrink-0" />
              <span>Partager sur Telegram</span>
            </button>
            <div className="my-1 border-t border-border/60" />
            <button
              onClick={() => {
                onCopyLink();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <Copy size={14} className="text-muted-foreground shrink-0" />
              <span>Copier le lien</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function PublicationCard({
  publication,
  onLikeToggle,
  onBookmarkToggle,
  onAddComment,
  sharePath
}: PublicationCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  // Détecte si le texte dépasse 2 lignes pour n'afficher "Voir plus" que
  // lorsque c'est réellement nécessaire (comme sur Facebook). Remesuré une
  // fois la police du corps de texte chargée : tant qu'elle ne l'est pas,
  // le navigateur affiche une police de secours aux métriques différentes,
  // ce qui peut fausser le calcul du nombre de lignes réellement visibles.
  // Tolérance volontairement large (pas juste +1px) : avec line-clamp, un
  // texte qui tient exactement sur 2 lignes peut avoir un scrollHeight
  // supérieur de quelques pixels au clientHeight à cause des arrondis de
  // rendu — sans marge, ça déclenchait un faux positif "Voir plus" dès la
  // 1ère ligne pour des textes courts qui n'ont pourtant rien de plus à
  // afficher.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => setIsTextTruncated(el.scrollHeight > el.clientHeight + 6);
    measure();

    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(measure);
    }
  }, [publication.content]);

  const anchorId = `post-${publication.id}`;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${sharePath}#${anchorId}` : "";

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
    void feedService.recordShare(publication.id);
  };

  const optionsMenuProps: OptionsMenuProps = {
    isOpen: isMenuOpen,
    onToggle: () => setIsMenuOpen((open) => !open),
    onClose: () => setIsMenuOpen(false),
    onCopyLink: () => {
      handleShare();
      setIsMenuOpen(false);
    },
    onReport: () => {
      setIsReportOpen(true);
      setIsMenuOpen(false);
    }
  };

  return (
    <Card id={anchorId} variant="base" className="select-none transition-all scroll-mt-20">
      {/* En-tête de publication : Auteur officiel, Badge, Date, Menu */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-4">
        <div className="flex items-center gap-3">
          <Avatar
            size="md"
            src={publication.author.avatarUrl}
            fallback="AG"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground tracking-tight">
                {publication.author.name}
              </span>
              {publication.author.isVerified && <VerifiedBadge size="xs" color="blue" ring={false} title="Compte officiel Agapeo" />}
              {publication.isPinned && (
                <Badge variant="status" className="text-[10px] px-2 py-0 gap-1">
                  <Pin size={10} /> Épinglé
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

        <OptionsMenu {...optionsMenuProps} />
      </CardHeader>

      {shareCopied && (
        <div className="mx-5 mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-700 dark:text-emerald-400">
          Lien copié dans le presse-papier.
        </div>
      )}

      {/* Titre + texte de la publication, tronqué avec "Voir plus" façon Facebook */}
      <CardContent className="px-5 pt-1 pb-3 space-y-2">
        {publication.title && (
          <h2 className="text-sm sm:text-lg font-display font-bold tracking-tight text-foreground leading-snug">
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
          <div>
            <p
              ref={contentRef}
              className={cn(
                "text-[13px] sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line",
                !isTextExpanded && "line-clamp-2"
              )}
            >
              {linkifyText(publication.content)}
            </p>
            {isTextTruncated && (
              <button
                type="button"
                onClick={() => setIsTextExpanded((expanded) => !expanded)}
                className="mt-1 text-[11px] sm:text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {isTextExpanded ? "Voir moins" : "Voir plus"}
              </button>
            )}
          </div>
        )}
      </CardContent>

      {/* Média : image, galerie, vidéo ou YouTube — pleine largeur façon Facebook */}
      {publication.mediaType === "IMAGE" && publication.images && publication.images[0] && (
        <div className="bg-secondary flex items-center justify-center max-h-[32rem] overflow-hidden">
          <img
            src={publication.images[0].url}
            alt="Illustration"
            className="w-full h-auto max-h-[32rem] object-contain"
          />
        </div>
      )}

      {publication.mediaType === "GALLERY" && publication.images && (
        <div className="px-3 pb-3">
          <MediaGallery photos={publication.images} />
        </div>
      )}

      {publication.mediaType === "VIDEO" && publication.videoUrl && (
        <div className="bg-black relative">
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
          {/* Filet visuel pour une vidéo sans miniature (ancienne publication
              d'avant la génération automatique, ou échec de génération) :
              sans ça le lecteur reste un simple rectangle noir tant que les
              contrôles natifs n'ont pas fini de charger, ce qui a été
              remonté comme "la vidéo ne marche pas" par un membre. */}
          {!publication.videoThumbnail && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Play size={22} className="text-white fill-white ml-1" />
              </div>
            </div>
          )}
        </div>
      )}

      {publication.mediaType === "YOUTUBE" && publication.videoUrl && <YouTubePlayer videoId={publication.videoUrl} />}

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
            <ShareMenu
              shareText={publication.title || publication.content.slice(0, 100)}
              shareUrl={shareUrl}
              sharesCount={publication.sharesCount}
              onCopyLink={handleShare}
              onPlatformShare={() => void feedService.recordShare(publication.id)}
            />
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

        {/* Section Commentaires dépliante — marge horizontale du footer annulée pour lui laisser plus de largeur */}
        {showComments && (
          <div className="w-full -mx-5">
            <CommentSection
              publicationId={publication.id}
              comments={publication.comments}
              onAddComment={(content, parentCommentId) => onAddComment(publication.id, content, parentCommentId)}
            />
          </div>
        )}
      </CardFooter>

      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} targetType="POST" targetId={publication.id} />
    </Card>
  );
}
