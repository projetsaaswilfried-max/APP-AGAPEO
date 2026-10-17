"use client";

import React, { useState, useEffect, useRef } from "react";
import { FeedPublication, FeedCategory } from "@/domain/types/feed";
import { feedService } from "@/domain/services/feed.service";
import { PublicationCard } from "@/components/features/feed/publication-card";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, RefreshCw, AlertCircle, LayoutGrid, HeartHandshake, Users, Lightbulb, Quote } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRANSITION_EASE } from "@/core/animations/variants";

// Nombre de publications "récentes" (hors épinglées) renvoyées par chaque
// appel à `getPublications`/`getMoreRecentPublications` — doit rester
// identique des deux côtés pour que la pagination s'enchaîne sans trou ni doublon.
const RECENT_PAGE_SIZE = 30;

const CATEGORY_TABS = [
  { id: "ALL", label: "Tout le fil", icon: LayoutGrid },
  { id: "TEACHING", label: "Enseignements", icon: BookOpen },
  { id: "TESTIMONY", label: "Témoignages", icon: HeartHandshake },
  { id: "WORKSHOP", label: "Atelier/Mariage", icon: Users },
  { id: "ADVICE", label: "Conseils & Préparation", icon: Lightbulb },
  { id: "QUOTE", label: "Pensées & Citations", icon: Quote }
];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<FeedCategory>("ALL");
  // Rubrique dont le contenu est réellement affiché : ne change qu'une fois
  // ses publications chargées, et c'est ce changement qui déclenche le
  // glissement vers la gauche (l'ancien contenu reste en place, atténué,
  // pendant le chargement — plus de squelette qui « mange » l'animation).
  const [displayedCategory, setDisplayedCategory] = useState<FeedCategory>("ALL");
  const latestRequestRef = useRef<FeedCategory>("ALL");
  const selectCategory = (id: FeedCategory) => {
    if (id === activeCategory) return;
    setActiveCategory(id);
  };
  const [publications, setPublications] = useState<FeedPublication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  // Défilement infini mobile uniquement (format app native : feed_body.dart
  // charge la suite en approchant du bas) — desktop reste plafonné à 30
  // publications récentes comme aujourd'hui, aucun changement là-bas.
  const [recentOffset, setRecentOffset] = useState(0);
  const [hasMoreRecent, setHasMoreRecent] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const mobileSentinelRef = useRef<HTMLDivElement>(null);

  const fetchPublications = async (category: FeedCategory) => {
    latestRequestRef.current = category;
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await feedService.getPublications(category);
      // Clics rapides d'une rubrique à l'autre : seule la dernière demandée s'affiche.
      if (latestRequestRef.current !== category) return;
      setPublications(data);
      setDisplayedCategory(category);
      setRecentOffset(RECENT_PAGE_SIZE);
      setHasMoreRecent(true);
    } catch {
      if (latestRequestRef.current === category) setIsError(true);
    } finally {
      if (latestRequestRef.current === category) setIsLoading(false);
    }
  };
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
    fetchPublications(activeCategory);
  }, [activeCategory]);

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
  }, [activeCategory]);

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
    <div className="w-full pb-16 select-none lg:grid lg:grid-cols-[13.5rem_minmax(0,42rem)] lg:justify-center lg:gap-8">
      <nav aria-label="Rubriques du fil" className="hidden lg:block">
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

      <div className="space-y-6 max-w-2xl mx-auto w-full min-w-0">
        <div className="flex flex-col space-y-4">
          <PageHeader title="Fil d'actualité" description="Enseignements, témoignages et conseils partagés par l'équipe Agapeo." />

          {/* Filtres par Catégorie — mobile/tablette (colonne verticale à gauche sur ordinateur) */}
          <Tabs
            variant="pill"
            tabs={CATEGORY_TABS}
            activeTabId={activeCategory}
            onChange={(id) => selectCategory(id as FeedCategory)}
            className="lg:hidden"
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={displayedCategory}
          initial={{ opacity: 0, x: 56 }}
          animate={{ opacity: isLoading && !isFirstLoad ? 0.55 : 1, x: 0 }}
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
                <Button variant="outline" size="sm" onClick={() => fetchPublications(activeCategory)}>
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
                  icon={<BookOpen size={24} />}
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
  );
}
