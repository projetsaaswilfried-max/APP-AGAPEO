"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { ArrowLeft, ArrowRight, BadgeCheck, Bookmark, Heart, MapPin, MessageSquare, RefreshCw } from "lucide-react";
import { RecommendedProfileItem } from "@/domain/types/discover";
import { cn, maskForPreview } from "@/lib/utils";

/** Distance (px) ou vitesse (px/s) de glissement à partir de laquelle la carte change. */
const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 500;
/** Charge la suite quand il ne reste plus que ce nombre de profils devant soi. */
const PRELOAD_THRESHOLD = 3;

interface DiscoverSwipeStackProps {
  items: RecommendedProfileItem[];
  /** Mêmes règles que DiscoverProfileCard : l'un ou l'autre suffit pour voir prénom/âge/pays en clair. */
  canView: boolean;
  canInteract: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onInspectProfile: (item: RecommendedProfileItem) => void;
  onToggleFavorite: (id: string) => void;
  onToggleLike: (id: string) => void;
  onSendMessage: (profileId: string) => void;
  onRequireVerification: (reason: string) => void;
}

/**
 * Découvrir sur mobile : une pile de cartes façon appli de rencontre, un
 * profil à la fois. Glisser à gauche passe au suivant, à droite revient au
 * précédent — le glissement ne fait que naviguer, le like reste un bouton
 * explicite (jamais d'action involontaire sur un geste).
 */
export function DiscoverSwipeStack({
  items,
  canView,
  canInteract,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onInspectProfile,
  onToggleFavorite,
  onToggleLike,
  onSendMessage,
  onRequireVerification
}: DiscoverSwipeStackProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const current = items[index];
  const isAtEnd = index >= items.length;

  // Nouvelle recherche / nouveaux filtres : la liste repart de zéro, la pile aussi.
  const firstId = items[0]?.profile.id;
  useEffect(() => {
    setIndex(0);
  }, [firstId]);

  useEffect(() => {
    if (hasMore && !isLoadingMore && items.length - index <= PRELOAD_THRESHOLD) onLoadMore();
  }, [index, items.length, hasMore, isLoadingMore, onLoadMore]);

  const goNext = () => {
    if (isAtEnd) return;
    setDirection(1);
    setIndex((i) => i + 1);
  };
  const goPrevious = () => {
    if (index === 0) return;
    setDirection(-1);
    setIndex((i) => i - 1);
  };

  const handleLike = (item: RecommendedProfileItem) =>
    canInteract ? onToggleLike(item.profile.id) : onRequireVerification("liker ce profil");
  const handleFavorite = (item: RecommendedProfileItem) =>
    canInteract ? onToggleFavorite(item.profile.id) : onRequireVerification("mettre ce membre en favori");
  const handleMessage = (item: RecommendedProfileItem) =>
    canInteract ? onSendMessage(item.profile.id) : onRequireVerification("contacter ce membre");

  return (
    <div className="space-y-4 select-none">
      <div className="relative h-[58dvh] min-h-[380px] max-h-[560px]">
        {/* Cartes suivantes, en retrait derrière la carte active */}
        {[2, 1].map((offset) => {
          const behind = items[index + offset];
          if (!behind) return null;
          return (
            <div
              key={behind.profile.id}
              aria-hidden
              className="absolute inset-0 rounded-[28px] overflow-hidden bg-secondary border border-border/60 shadow-soft transition-transform duration-300"
              style={{ transform: `translateY(${offset * 12}px) scale(${1 - offset * 0.05})` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={behind.profile.avatarUrl || undefined} alt="" className="w-full h-full object-cover" />
            </div>
          );
        })}

        <AnimatePresence initial={false} custom={direction}>
          {current ? (
            <SwipeCard
              key={current.profile.id}
              item={current}
              direction={direction}
              canSeeDetails={canInteract || canView}
              onSwipeLeft={goNext}
              onSwipeRight={goPrevious}
              onTap={() => onInspectProfile(current)}
            />
          ) : (
            <motion.div
              key="end"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 rounded-[28px] bg-card border border-border/60 shadow-soft flex flex-col items-center justify-center gap-4 p-8 text-center"
            >
              {isLoadingMore ? (
                <RefreshCw size={22} className="text-muted-foreground animate-spin" />
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-accent-subtle flex items-center justify-center">
                    <Heart size={22} className="text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Tu as vu tous les profils</p>
                    <p className="text-xs text-muted-foreground">De nouveaux membres rejoignent la communauté chaque jour.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDirection(-1);
                      setIndex(0);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-full px-4 py-2"
                  >
                    <RefreshCw size={13} /> Revoir depuis le début
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions : naviguer, favori, like, message */}
      <div className="flex items-center justify-center gap-3">
        <StackButton label="Profil précédent" onClick={goPrevious} disabled={index === 0} size="sm">
          <ArrowLeft size={18} />
        </StackButton>
        <StackButton
          label={current?.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          onClick={() => current && handleFavorite(current)}
          disabled={!current}
          isActive={current?.isFavorite}
        >
          <Bookmark size={20} className={cn(current?.isFavorite && "fill-current")} />
        </StackButton>
        <StackButton
          label={current?.isLiked ? "Retirer le like" : "Liker ce profil"}
          onClick={() => current && handleLike(current)}
          disabled={!current}
          size="lg"
          isPrimary
          isActive={current?.isLiked}
        >
          <Heart size={26} className={cn(current?.isLiked && "fill-current")} />
        </StackButton>
        <StackButton label="Envoyer un message" onClick={() => current && handleMessage(current)} disabled={!current}>
          <MessageSquare size={20} />
        </StackButton>
        <StackButton label="Profil suivant" onClick={goNext} disabled={isAtEnd} size="sm">
          <ArrowRight size={18} />
        </StackButton>
      </div>

      {items.length > 0 && !isAtEnd && (
        <p className="text-center text-[11px] text-muted-foreground">
          Glisse pour passer d&apos;un profil à l&apos;autre · touche la carte pour tout voir
        </p>
      )}
    </div>
  );
}

function SwipeCard({
  item,
  direction,
  canSeeDetails,
  onSwipeLeft,
  onSwipeRight,
  onTap
}: {
  item: RecommendedProfileItem;
  direction: 1 | -1;
  canSeeDetails: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
}) {
  const { profile } = item;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-9, 9]);

  const displayName = canSeeDetails ? profile.firstName : maskForPreview(profile.firstName, 2);
  const displayAge = canSeeDetails ? `${profile.age} ans` : `${maskForPreview(String(profile.age))} ans`;
  const displayCountry = canSeeDetails ? profile.country : maskForPreview(profile.country);
  const description = profile.quote || profile.bio;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onSwipeLeft();
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onSwipeRight();
  };

  return (
    <motion.div
      custom={direction}
      variants={{
        // En avançant, la carte suivante était déjà en retrait derrière : elle remonte au premier plan.
        // En revenant en arrière, la carte précédente revient depuis la gauche.
        enter: (dir: 1 | -1) => (dir > 0 ? { scale: 0.95, y: 12, opacity: 1, x: 0 } : { x: -420, opacity: 0 }),
        center: { x: 0, y: 0, scale: 1, opacity: 1 },
        exit: (dir: 1 | -1) => (dir > 0 ? { x: -480, opacity: 0 } : { scale: 0.95, y: 12, opacity: 0 })
      }}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.85}
      onDragEnd={handleDragEnd}
      onTap={onTap}
      style={{ x, rotate }}
      className="absolute inset-0 rounded-[28px] overflow-hidden bg-secondary border border-border/60 shadow-soft cursor-grab active:cursor-grabbing touch-pan-y"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={profile.avatarUrl || undefined} alt={displayName} draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent 45%, rgba(20,14,24,0.82) 100%)" }}
      />

      <div className="absolute inset-x-0 bottom-0 p-5 text-white space-y-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <h3 className="text-2xl font-display font-semibold tracking-tight truncate">
            {displayName}, <span className="font-normal">{displayAge}</span>
          </h3>
          {profile.badges.some((b) => b.code === "VERIFIED_FAITH") && <BadgeCheck size={20} className="shrink-0 fill-primary text-white" />}
        </div>
        {displayCountry && (
          <p className="flex items-center gap-1 text-sm text-white/85">
            <MapPin size={14} className="shrink-0" /> {displayCountry}
          </p>
        )}
        {description && <p className="text-sm text-white/80 leading-snug line-clamp-2">{description}</p>}
        <p className="pt-1 text-xs font-semibold text-white/95 underline underline-offset-4">Voir le profil</p>
      </div>
    </motion.div>
  );
}

function StackButton({
  label,
  onClick,
  disabled,
  size = "md",
  isPrimary,
  isActive,
  children
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  isPrimary?: boolean;
  isActive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center shadow-soft border transition-all active:scale-90 disabled:opacity-35 disabled:active:scale-100",
        size === "sm" && "w-11 h-11",
        size === "md" && "w-13 h-13",
        size === "lg" && "w-16 h-16",
        isPrimary
          ? isActive
            ? "bg-card text-primary border-primary/40"
            : "bg-primary text-primary-foreground border-primary"
          : isActive
            ? "bg-accent-subtle text-accent border-accent/30"
            : "bg-card text-foreground border-border/60"
      )}
    >
      {children}
    </button>
  );
}
