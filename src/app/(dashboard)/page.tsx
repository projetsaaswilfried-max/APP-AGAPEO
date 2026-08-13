"use client";

import React, { useState, useEffect } from "react";
import { FeedPublication, FeedCategory } from "@/domain/types/feed";
import { feedService } from "@/domain/services/feed.service";
import { PublicationCard } from "@/components/features/feed/publication-card";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Megaphone, BookOpen, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_TABS = [
  { id: "ALL", label: "Tout le fil" },
  { id: "TEACHING", label: "Enseignements" },
  { id: "TESTIMONY", label: "Témoignages" },
  { id: "ADVICE", label: "Conseils & Préparation" },
  { id: "QUOTE", label: "Pensées & Citations" }
];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<FeedCategory>("ALL");
  const [publications, setPublications] = useState<FeedPublication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchPublications = async (category: FeedCategory) => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await feedService.getPublications(category);
      setPublications(data);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublications(activeCategory);
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

  const handleAddComment = async (publicationId: string, content: string) => {
    const newComment = await feedService.addComment(publicationId, content);
    setPublications((prev) =>
      prev.map((pub) =>
        pub.id === publicationId
          ? {
              ...pub,
              commentsCount: pub.commentsCount + 1,
              comments: [newComment, ...pub.comments]
            }
          : pub
      )
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto w-full pb-16 select-none">
      {/* En-tête du Fil d'Actualité Officiel */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
              CERCLE AGAPE
            </span>
            <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">
              Fil de Réflexion & Inspirations
            </h1>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 text-primary text-xs font-medium border border-accent/20">
            <Megaphone size={13} /> Officiel
          </div>
        </div>

        {/* Filtres par Catégorie */}
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <Tabs
            variant="pill"
            tabs={CATEGORY_TABS}
            activeTabId={activeCategory}
            onChange={(id) => setActiveCategory(id as FeedCategory)}
          />
        </div>
      </div>

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
      {isLoading && !isError && (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="p-6 bg-card border border-border/60 rounded-2xl space-y-4 shadow-2xs">
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
      {!isLoading && !isError && (
        <>
          {publications.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={24} />}
              title="Aucune publication dans cette catégorie"
              description="L'équipe officielle ajoutera prochainement de nouveaux enseignements et témoignages ici."
              action={
                <Button variant="outline" size="sm" onClick={() => setActiveCategory("ALL")}>
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
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
