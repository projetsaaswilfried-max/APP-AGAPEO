"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { FeedPublication, FeedCategory } from "@/domain/types/feed";
import { feedService } from "@/domain/services/feed.service";
import { PublicationCard } from "@/components/features/feed/publication-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { GraduationCap, RefreshCw, AlertCircle, LayoutGrid, HeartHandshake, Users, Lightbulb, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/core/providers/session-provider";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/core/query-keys";
import { TRANSITION_EASE } from "@/core/animations/variants";

// Nombre de publications "récentes" (hors épinglées) renvoyées par chaque
// appel à `getPublications`/`getMoreRecentPublications` — doit rester
// identique des deux côtés pour que la pagination s'enchaîne sans trou ni doublon.
const RECENT_PAGE_SIZE = 30;

const CATEGORY_TABS = [
  { id: "ALL", label: "Tout le fil", icon: LayoutGrid },
  { id: "TEACHING", label: "Enseignements", icon: GraduationCap },
  { id: "TESTIMONY", label: "Témoignages", icon: HeartHandshake },
  { id: "WORKSHOP", label: "Atelier/Mariage", icon: Users },
  { id: "ADVICE", label: "Conseils & Préparation", icon: Lightbulb },
  { id: "QUOTE", label: "Pensées & Citations", icon: Quote }
];

/** Largeur réservée à gauche de la rangée de rubriques (marge + flèche « précédente ») sur mobile. */
const CHIP_ARROW_ZONE_PX = 64;

export default function HomePage() {
  const { profile } = useSession();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<FeedCategory>("ALL");
  // Rubrique dont le contenu est réellement affiché : ne change qu'une fois
  // ses publications chargées, et c'est ce changement qui déclenche le
  // glissement vers la gauche (l'ancien contenu reste en place, atténué,
  // pendant le chargement — plus de squelette qui « mange » l'animation).
  const [displayedCategory, setDisplayedCategory] = useState<FeedCategory>("ALL");
  const selectCategory = (id: FeedCategory) => {
    if (id === activeCategory) return;
    setActiveCategory(id);
  };

  // Mobile : la rubrique choisie vient se placer au bord gauche de la rangée
  // (les précédentes sortent du cadre), juste après la flèche « précédente »
  // qui apparaît alors. Défilement de la rangée seule, jamais de la page.
  const chipsRef = useRef<HTMLDivElement>(null);
  const activeIndex = CATEGORY_TABS.findIndex((tab) => tab.id === activeCategory);
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-category="${activeCategory}"]`);
    if (!row || !chip) return;
    row.scrollTo({ left: activeIndex === 0 ? 0 : chip.offsetLeft - CHIP_ARROW_ZONE_PX, behavior: "smooth" });
  }, [activeCategory, activeIndex]);

  // Mobile : glisser le doigt sur le fil vers la gauche passe à la rubrique
  // suivante, vers la droite revient à la précédente (geste nettement
  // horizontal uniquement, pour ne jamais gêner le défilement vertical).
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    touchStartRef.current = target.closest("iframe, video, input, textarea, [data-swipe-ignore]")
      ? null
      : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    const index = CATEGORY_TABS.findIndex((tab) => tab.id === activeCategory);
    const next = CATEGORY_TABS[index + (dx < 0 ? 1 : -1)];
    if (next) selectCategory(next.id as FeedCategory);
  };
  const feedQueryKey = queryKeys.feed(profile.id, activeCategory);
  // Retour sur le fil : la dernière liste vue de cette rubrique s'affiche
  // tout de suite (cache React Query), rafraîchie ensuite. keepPreviousData
  // garde l'ancien contenu affiché pendant le changement de rubrique (c'est
  // justement ce qui pilote l'animation de glissement plus bas) au lieu de
  // vider l'écran le temps du nouveau chargement — React Query gère aussi
  // tout seul "seule la dernière rubrique demandée s'affiche" en cas de clics
  // rapides, plus besoin de le suivre à la main.
  const {
    data: publications = [],
    isLoading,
    isError,
    isFetching,
    refetch: refetchFeed
  } = useQuery({
    queryKey: feedQueryKey,
    queryFn: () => feedService.getPublications(activeCategory),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000
  });
  const setPublications = useCallback(
    (updater: (prev: FeedPublication[]) => FeedPublication[]) => {
      queryClient.setQueryData<FeedPublication[]>(feedQueryKey, (prev) => updater(prev ?? []));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, profile.id, activeCategory]
  );
  // Défilement infini mobile uniquement (format app native : feed_body.dart
  // charge la suite en approchant du bas) — desktop reste plafonné à 30
  // publications récentes comme aujourd'hui, aucun changement là-bas.
  const [recentOffset, setRecentOffset] = useState(0);
  const [hasMoreRecent, setHasMoreRecent] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const mobileSentinelRef = useRef<HTMLDivElement>(null);

  // Changement de rubrique : la fenêtre de pagination "récentes" repart de
  // zéro tout de suite (pas besoin d'attendre la réponse, corrigée au
  // premier vrai `loadMoreRecent` de toute façon) — jamais sur un simple
  // rafraîchissement arrière-plan de la rubrique déjà affichée, qui casserait
  // sinon la position de défilement infini déjà accumulée.
  useEffect(() => {
    setRecentOffset(RECENT_PAGE_SIZE);
    setHasMoreRecent(true);
  }, [activeCategory]);

  // Le glissement visuel n'intervient qu'une fois le contenu de la nouvelle
  // rubrique réellement prêt (cache ou réseau) — jamais pendant le chargement.
  useEffect(() => {
    if (!isFetching) setDisplayedCategory(activeCategory);
  }, [activeCategory, isFetching]);
  // Squelette seulement au tout premier chargement ; ensuite l'ancien contenu reste affiché.
  const isFirstLoad = isLoading && publications.length === 0;

  const loadMoreRecent = async () => {
    if (isLoadingMore || !hasMoreRecent) return;
    setIsLoadingMore(true);
    try {
      const { items, hasMore } = await feedService.getMoreRecentPublications(activeCategory, recentOffset, RECENT_PAGE_SIZE);
      // Une nouvelle publication arrivée en direct (Realtime) entre deux
      // pages décale la fenêtre côté serveur d'une position — filtre les
      // doublons plutôt que de les laisser s'afficher deux fois dans la liste.
      setPublications((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...items.filter((item) => !existingIds.has(item.id))];
      });
      setRecentOffset((prev) => prev + RECENT_PAGE_SIZE);
      setHasMoreRecent(hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const sentinel = mobileSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRecent();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publications, recentOffset, activeCategory]);

  // Un lien partagé (`/feed#post-xxx`) doit amener directement sur ce post
  // précis — sans ça, "copier le lien" ne fait qu'ouvrir le haut du fil.
  useEffect(() => {
    if (isLoading || !window.location.hash) return;
    const el = document.getElementById(window.location.hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-accent");
    const timeout = setTimeout(() => el.classList.remove("ring-2", "ring-accent"), 2500);
    return () => clearTimeout(timeout);
  }, [isLoading, publications]);

  useEffect(() => {
    const unsubscribe = feedService.subscribeToNewPosts(activeCategory, (newPost) => {
      setPublications((prev) => {
        if (prev.some((pub) => pub.id === newPost.id)) return prev;
        const pinned = prev.filter((pub) => pub.isPinned);
        const rest = prev.filter((pub) => !pub.isPinned);
        return [...pinned, newPost, ...rest];
      });
    });
    return unsubscribe;
  }, [activeCategory, setPublications]);

  const handleLikeToggle = async (id: string) => {
    // Optimistic UI update
    setPublications((prev) =>
      prev.map((pub) =>
        pub.id === id
          ? {
              ...pub,
              hasLiked: !pub.hasLiked,
              reactionsCount: pub.reactionsCount + (pub.hasLiked ? -1 : 1)
            }
          : pub
      )
    );
    await feedService.toggleLike(id);
  };

  const handleBookmarkToggle = async (id: string) => {
    setPublications((prev) =>
      prev.map((pub) =>
        pub.id === id ? { ...pub, isBookmarked: !pub.isBookmarked } : pub
      )
    );
    await feedService.toggleBookmark(id);
  };

  const handleAddComment = async (publicationId: string, content: string, parentCommentId?: string) => {
    const newComment = await feedService.addComment(publicationId, content, parentCommentId);
    setPublications((prev) =>
      prev.map((pub) => {
        if (pub.id !== publicationId) return pub;
        if (!parentCommentId) {
          return { ...pub, commentsCount: pub.commentsCount + 1, comments: [newComment, ...pub.comments] };
        }
        return {
          ...pub,
          commentsCount: pub.commentsCount + 1,
          comments: pub.comments.map((c) =>
            c.id === parentCommentId ? { ...c, replies: [...(c.replies ?? []), newComment] } : c
          )
        };
      })
    );
  };

  const handleUpdateComment = (commentId: string, content: string) => {
    setPublications((prev) =>
      prev.map((pub) => ({
        ...pub,
        comments: pub.comments.map((c) =>
          c.id === commentId
            ? { ...c, content, isEdited: true }
            : { ...c, replies: c.replies?.map((r) => (r.id === commentId ? { ...r, content, isEdited: true } : r)) }
        )
      }))
    );
    void feedService.updateComment(commentId, content);
  };

  const handleDeleteComment = (commentId: string) => {
    setPublications((prev) =>
      prev.map((pub) => {
        const deletedTopLevel = pub.comments.find((c) => c.id === commentId);
        if (deletedTopLevel) {
          return {
            ...pub,
            commentsCount: Math.max(0, pub.commentsCount - 1 - (deletedTopLevel.replies?.length ?? 0)),
            comments: pub.comments.filter((c) => c.id !== commentId)
          };
        }
        return {
          ...pub,
          commentsCount: Math.max(0, pub.commentsCount - 1),
          comments: pub.comments.map((c) => ({ ...c, replies: c.replies?.filter((r) => r.id !== commentId) }))
        };
      })
    );
    void feedService.deleteComment(commentId);
  };

  return (
    // Ordinateur (lg+) : rubriques en colonne verticale à gauche, la rubrique
    // choisie remplace le fil à droite. Mobile/tablette : onglets horizontaux.
    // Flex (et non grille) : rubriques à largeur fixe à gauche, fil centré à côté — les
    // deux restent côte à côte même si une règle utilitaire venait à manquer.
    <div className="w-full pb-16 select-none lg:flex lg:items-start lg:justify-center lg:gap-8">
      <nav aria-label="Rubriques du fil" className="hidden lg:block w-[13.5rem] shrink-0 self-stretch">
        <div className="sticky top-24 space-y-1">
          <p className="px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rubriques</p>
          {CATEGORY_TABS.map((tab) => {
            const isActive = tab.id === activeCategory;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectCategory(tab.id as FeedCategory)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm text-left transition-colors",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground font-medium hover:text-foreground hover:bg-card/70"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="feed-category-pill"
                    className="absolute inset-0 rounded-full bg-card border border-border/50"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <TabIcon size={17} className={cn("relative z-10 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className="relative z-10 truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="space-y-6 max-w-2xl mx-auto lg:mx-0 w-full min-w-0">
        <div className="flex flex-col space-y-4">
          <PageHeader title="Fil d'actualité" description="Enseignements, témoignages et conseils partagés par l'équipe Agapeo." />

          {/* Rubriques — mobile/tablette : puces à icône (colonne verticale à gauche sur ordinateur).
              La rubrique choisie se cale à gauche ; flèches pour passer à la précédente / suivante. */}
          <div data-swipe-ignore className="lg:hidden relative -mx-5">
            <div ref={chipsRef} className="relative flex gap-2 overflow-x-auto px-5">
              {CATEGORY_TABS.map((tab) => {
                const isActive = tab.id === activeCategory;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-category={tab.id}
                    onClick={() => selectCategory(tab.id as FeedCategory)}
                    aria-pressed={isActive}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm border transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-card text-muted-foreground border-border/60 font-medium"
                    )}
                  >
                    <TabIcon size={15} className="shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
              {/* Espace de fin : permet aux dernières rubriques de venir elles aussi se caler à gauche. */}
              <span aria-hidden className="shrink-0 w-[70vw]" />
            </div>

            {activeIndex > 0 && (
              <div className="absolute inset-y-0 left-0 flex items-center pl-5 pr-3 bg-gradient-to-r from-background from-70% to-transparent">
                <button
                  type="button"
                  onClick={() => selectCategory(CATEGORY_TABS[activeIndex - 1].id as FeedCategory)}
                  aria-label={`Rubrique précédente : ${CATEGORY_TABS[activeIndex - 1].label}`}
                  className="w-9 h-9 rounded-full bg-card border border-border/60 flex items-center justify-center text-foreground active:scale-90 transition-transform"
                >
                  <ChevronLeft size={17} />
                </button>
              </div>
            )}
            {activeIndex < CATEGORY_TABS.length - 1 && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-5 pl-3 bg-gradient-to-l from-background from-70% to-transparent">
                <button
                  type="button"
                  onClick={() => selectCategory(CATEGORY_TABS[activeIndex + 1].id as FeedCategory)}
                  aria-label={`Rubrique suivante : ${CATEGORY_TABS[activeIndex + 1].label}`}
                  className="w-9 h-9 rounded-full bg-card border border-border/60 flex items-center justify-center text-foreground active:scale-90 transition-transform"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={displayedCategory}
          initial={{ opacity: 0, x: 56 }}
          animate={{ opacity: isFetching && !isFirstLoad ? 0.55 : 1, x: 0 }}
          exit={{ opacity: 0, x: -56 }}
          transition={{ duration: 0.26, ease: TRANSITION_EASE }}
          className="space-y-6"
        >
          {/* État d'Erreur Simulé */}
          {isError && (
            <EmptyState
              icon={<AlertCircle size={24} className="text-destructive" />}
              title="Impossible de charger le fil d'actualité"
              description="Une erreur de connexion est survenue lors de la récupération des publications."
              action={
                <Button variant="outline" size="sm" onClick={() => refetchFeed()}>
                  <RefreshCw size={14} className="mr-1.5" /> Réessayer
                </Button>
              }
            />
          )}

          {/* État de Chargement (Skeleton Loaders) */}
          {isFirstLoad && !isError && (
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="p-6 bg-card border border-border/60 rounded-[16px] space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
              ))}
            </div>
          )}

          {/* Liste des Publications Officiellement Réglées */}
          {!isFirstLoad && !isError && (
            <>
              {publications.length === 0 ? (
                <EmptyState
                  icon={<GraduationCap size={24} />}
                  title="Aucune publication dans cette catégorie"
                  description="L'équipe officielle ajoutera prochainement de nouveaux enseignements et témoignages ici."
                  action={
                    <Button variant="outline" size="sm" onClick={() => selectCategory("ALL")}>
                      Voir tout le fil
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-6">
                  {publications.map((pub) => (
                    <PublicationCard
                      key={pub.id}
                      publication={pub}
                      onLikeToggle={handleLikeToggle}
                      onBookmarkToggle={handleBookmarkToggle}
                      onAddComment={handleAddComment}
                      onUpdateComment={handleUpdateComment}
                      onDeleteComment={handleDeleteComment}
                      sharePath="/feed"
                    />
                  ))}
                  {/* Mobile uniquement : sentinelle de défilement infini — desktop reste plafonné à 30 publications récentes, inchangé. */}
                  {hasMoreRecent && (
                    <div ref={mobileSentinelRef} className="md:hidden flex justify-center py-6">
                      {isLoadingMore && <RefreshCw size={18} className="text-muted-foreground animate-spin" />}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
