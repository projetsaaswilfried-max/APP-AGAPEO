"use client";

import { Suspense, useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RecommendedProfileItem, DiscoverFilterCriteria } from "@/domain/types/discover";
import { discoverService } from "@/domain/services/discover.service";
import { PremiumRequiredError, VerificationRequiredError } from "@/domain/errors";
import { DiscoverProfileCard } from "@/components/features/discover/discover-profile-card";
import { FilterPanel } from "@/components/features/discover/filter-panel";
import { ProfileDrawerInspector } from "@/components/features/discover/profile-drawer-inspector";
import { PremiumRequiredModal } from "@/components/features/premium/premium-required-modal";
import { AccessExpiredState } from "@/components/features/premium/access-expired-state";
import { VerificationRequiredModal } from "@/components/features/discover/verification-required-modal";
import { SendInvitationModal } from "@/components/features/messages/send-invitation-modal";
import { useSendInvitation } from "@/core/hooks/use-send-invitation";
import { SearchInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { useSession } from "@/core/providers/session-provider";
import { getScoringGaps } from "@/domain/profile-completeness";
import { Users, SlidersHorizontal, RefreshCw, CheckCircle2, AlertCircle, Heart, ArrowRight, Clock, ShieldAlert } from "lucide-react";

const DEFAULT_FILTERS: DiscoverFilterCriteria = { ageMin: 20, ageMax: 50, status: "ALL" };

// "Recommandée pour vous" reste un tirage fixe de 3, jamais paginé — seule
// "Autres profils" peut compter des dizaines/centaines de membres et
// bénéficie de la pagination (évite un défilement sans fin, cf. demande).
const OTHER_PROFILES_PAGE_SIZE = 12;

// Tant que la photo n'est pas VERIFIED (jamais soumise, en attente, ou
// refusée), Découvrir reste consultable en aperçu (photos floutées, aucune
// interaction réelle) mais pas exploitable — un bandeau rappelle pourquoi et
// incite à finaliser la vérification, avec un message adapté à chaque cas.
const VERIFICATION_BANNER_CONTENT: Record<"UNVERIFIED" | "PENDING" | "REJECTED", { icon: ReactNode; description: string; cta: string }> = {
  UNVERIFIED: {
    icon: <ShieldAlert size={14} className="text-accent shrink-0" />,
    description: "Ceci est un aperçu : valide ton profil pour voir les noms, âges, villes complets et contacter les membres.",
    cta: "Vérifier mon profil"
  },
  PENDING: {
    icon: <Clock size={14} className="text-accent shrink-0" />,
    description: "Ton profil est en cours de vérification — en attendant, voici un aperçu des membres de la communauté.",
    cta: "Voir ma demande"
  },
  REJECTED: {
    icon: <ShieldAlert size={14} className="text-accent shrink-0" />,
    description: "Ta photo de profil n'a pas été validée : soumets-en une nouvelle pour contacter les membres que tu découvres ici.",
    cta: "Soumettre une nouvelle photo"
  }
};

function DiscoverPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useSession();
  const scoringGaps = getScoringGaps(profile);
  // Faux tant que le profil n'est pas vérifié : Découvrir reste consultable
  // (aperçu flouté), seules les interactions réelles (contacter, favori,
  // fiche complète) restent bloquées — cf. VerificationRequiredModal.
  const canInteract = profile.photo_verification_status === "VERIFIED" || profile.is_staff;
  // Recherche et filtres (y compris la recherche de base âge/pays/statut)
  // réservés Premium — cf. le même garde côté serveur dans discover.service.ts.
  const canUseAdvancedFilters = profile.subscription_status === "ACTIVE" || profile.is_staff;
  // Consulter une fiche complète (ouvrir la fiche détaillée) est également
  // réservé Premium, sans grâce — même garde côté serveur pour l'URL directe
  // (/profile/[id]/page.tsx) et côté RPC (record_profile_view).
  const canViewProfiles = profile.subscription_status === "ACTIVE" || profile.is_staff;
  // "Recommandée pour vous" (toujours 3) et la page courante d'"Autres
  // profils" sont désormais récupérées et hydratées séparément côté serveur
  // (getDiscoverPage) — Découvrir ne télécharge plus les 300-400+ profils
  // complets de tout le vivier à chaque chargement, seulement ce qui
  // s'affiche réellement.
  const [recommendedProfiles, setRecommendedProfiles] = useState<RecommendedProfileItem[]>([]);
  const [otherProfilesPageItems, setOtherProfilesPageItems] = useState<RecommendedProfileItem[]>([]);
  const [otherProfilesTotalCount, setOtherProfilesTotalCount] = useState(0);
  const [filters, setFilters] = useState<DiscoverFilterCriteria>(() => {
    const search = searchParams.get("search");
    return search && canUseAdvancedFilters ? { ...DEFAULT_FILTERS, searchQuery: search } : DEFAULT_FILTERS;
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<RecommendedProfileItem | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPremiumRequiredOpen, setIsPremiumRequiredOpen] = useState(false);
  const [premiumReason, setPremiumReason] = useState("contacter ce membre en premier");
  const [isVerificationRequiredOpen, setIsVerificationRequiredOpen] = useState(false);
  const [verificationReason, setVerificationReason] = useState("contacter ce membre");
  const [otherProfilesPage, setOtherProfilesPage] = useState(1);
  const otherProfilesSectionRef = useRef<HTMLDivElement>(null);

  const handleRequireVerification = (reason: string) => {
    setVerificationReason(reason);
    setIsVerificationRequiredOpen(true);
  };

  const fetchProfiles = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await discoverService.getDiscoverPage(filters, otherProfilesPage, OTHER_PROFILES_PAGE_SIZE);
      setRecommendedProfiles(data.recommended);
      setOtherProfilesPageItems(data.otherPage);
      setOtherProfilesTotalCount(data.otherTotalCount);
    } catch (err) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Changer de filtre revient toujours à la page 1 — l'effet ci-dessous
  // (déclenché par le changement de `otherProfilesPage` qui en résulte, en
  // plus de `filters` lui-même) se charge de relancer le chargement.
  useEffect(() => {
    setOtherProfilesPage(1);
  }, [filters]);

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, otherProfilesPage]);

  /** Un profil "recommandé" ou de la page courante peut être basculé favori/liké — jamais les deux listes à la fois pour un même id, mais on ne sait pas laquelle sans chercher. */
  const updateProfileInLists = (profileId: string, updater: (item: RecommendedProfileItem) => RecommendedProfileItem) => {
    setRecommendedProfiles((prev) => prev.map((item) => (item.profile.id === profileId ? updater(item) : item)));
    setOtherProfilesPageItems((prev) => prev.map((item) => (item.profile.id === profileId ? updater(item) : item)));
  };

  const handleToggleFavorite = async (profileId: string) => {
    const toggle = (item: RecommendedProfileItem) => ({ ...item, isFavorite: !item.isFavorite });
    updateProfileInLists(profileId, toggle);
    try {
      await discoverService.toggleFavorite(profileId);
    } catch (err) {
      updateProfileInLists(profileId, toggle);
      if (err instanceof PremiumRequiredError) {
        setPremiumReason("mettre des profils en favori");
        setIsPremiumRequiredOpen(true);
        return;
      }
      if (err instanceof VerificationRequiredError) {
        handleRequireVerification("mettre ce membre en favori");
        return;
      }
      console.error(err);
    }
  };

  const handleToggleLike = async (profileId: string) => {
    const toggle = (item: RecommendedProfileItem) => ({ ...item, isLiked: !item.isLiked });
    updateProfileInLists(profileId, toggle);
    try {
      await discoverService.toggleLike(profileId);
    } catch (err) {
      updateProfileInLists(profileId, toggle);
      if (err instanceof VerificationRequiredError) {
        handleRequireVerification("liker ce profil");
        return;
      }
      console.error(err);
    }
  };

  const { pendingTarget: pendingInvitation, isSending: isSendingInvitation, requestSend: requestInvitation, cancel: cancelInvitation, confirmSend: confirmInvitation } = useSendInvitation({
    onSuccess: (conversationId) => router.push(`/messages?conversation=${conversationId}`),
    onPremiumRequired: () => {
      setPremiumReason("contacter ce membre en premier");
      setIsPremiumRequiredOpen(true);
    },
    onVerificationRequired: () => handleRequireVerification("contacter ce membre"),
    onError: (message) => {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 4000);
    }
  });

  const handleSendMessage = (profileId: string) => {
    const target = recommendedProfiles.find((p) => p.profile.id === profileId) ?? otherProfilesPageItems.find((p) => p.profile.id === profileId);
    requestInvitation(profileId, target?.profile.firstName ?? "ce membre");
  };

  const otherProfilesTotalPages = Math.max(1, Math.ceil(otherProfilesTotalCount / OTHER_PROFILES_PAGE_SIZE));
  const handleOtherProfilesPageChange = (page: number) => {
    setOtherProfilesPage(page);
    otherProfilesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const bannerContent = !canInteract
    ? VERIFICATION_BANNER_CONTENT[profile.photo_verification_status as "UNVERIFIED" | "PENDING" | "REJECTED"]
    : null;

  // Restriction paywall (compte EXPIRED, jamais FREE) : plus stricte que le
  // traitement des non-vérifiés ci-dessus, volontairement — cf. plan paywall §6.
  if (profile.subscription_status === "EXPIRED" && !profile.is_staff) {
    return (
      <div className="w-full pb-16 select-none">
        <AccessExpiredState feature="discover" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-16 select-none">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-foreground text-background px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
            <Users size={14} className="text-primary" /> ALLIANCES COMPATIBLES
          </span>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">Découvrir des Profils Sérieux</h1>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Des membres orientés vers le mariage, sélectionnés selon vos valeurs et vos critères.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <SearchInput
            placeholder={canUseAdvancedFilters ? "Rechercher par prénom, ville, profession..." : "Passe Premium pour rechercher"}
            value={filters.searchQuery || ""}
            onChange={(e) => canUseAdvancedFilters && setFilters({ ...filters, searchQuery: e.target.value })}
            onClear={() => setFilters({ ...filters, searchQuery: "" })}
            readOnly={!canUseAdvancedFilters}
            onClick={() => {
              if (canUseAdvancedFilters) return;
              setPremiumReason("utiliser la recherche");
              setIsPremiumRequiredOpen(true);
            }}
            className="flex-1 md:w-72 text-xs h-10 bg-card shadow-2xs"
          />

          <Button
            variant={isFilterOpen ? "primary" : "outline"}
            size="md"
            onClick={() => {
              if (!canUseAdvancedFilters) {
                setPremiumReason("utiliser les filtres de recherche");
                setIsPremiumRequiredOpen(true);
                return;
              }
              setIsFilterOpen(!isFilterOpen);
            }}
            leftIcon={<SlidersHorizontal size={16} />}
            className="shrink-0"
          >
            Filtres
          </Button>
        </div>
      </div>

      {bannerContent && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent/10 border border-accent/25 text-xs text-foreground">
          {bannerContent.icon}
          <span>{bannerContent.description}</span>
          <Link href="/profile?tab=account" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline ml-auto shrink-0">
            {bannerContent.cta} <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {isFilterOpen && canUseAdvancedFilters && (
        <div className="animate-in fade-in duration-150">
          <FilterPanel
            filters={filters}
            onChangeFilters={setFilters}
            onResetFilters={() => setFilters(DEFAULT_FILTERS)}
            isPremium={canUseAdvancedFilters}
            onRequirePremium={() => {
              setPremiumReason("débloquer les filtres avancés");
              setIsPremiumRequiredOpen(true);
            }}
          />
        </div>
      )}

      {isError && !isLoading && (
        <EmptyState
          icon={<AlertCircle size={24} className="text-destructive" />}
          title="Impossible de charger les profils"
          description="Une erreur est survenue lors du chargement de la découverte."
          action={
            <Button variant="outline" size="sm" onClick={fetchProfiles}>
              <RefreshCw size={14} className="mr-1.5" /> Réessayer
            </Button>
          }
        />
      )}

      {!isLoading && !isError && scoringGaps.length > 0 && (recommendedProfiles.length > 0 || otherProfilesTotalCount > 0) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent/10 border border-accent/25 text-xs text-foreground">
          <Heart size={14} className="text-accent shrink-0" />
          <span>
            Tes scores de compatibilité sont encore incomplets : renseigne {scoringGaps.join(", ")} pour des suggestions plus précises.
          </span>
          <Link href="/profile" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline ml-auto shrink-0">
            Compléter <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-card border border-border/60 rounded-3xl space-y-4 shadow-2xs">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && recommendedProfiles.length === 0 && otherProfilesTotalCount === 0 && (
        <EmptyState
          icon={<Users size={28} />}
          title="Aucun profil ne correspond à vos critères"
          description="Essayez de modifier votre recherche ou vos filtres pour découvrir d'autres membres. Si tu viens de créer ton compte, laisse le temps à la communauté de grandir."
          action={
            <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
              <RefreshCw size={14} className="mr-1.5" /> Réinitialiser les filtres
            </Button>
          }
        />
      )}

      {!isLoading && !isError && recommendedProfiles.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Heart size={13} className="text-accent" /> Recommandée pour vous
            </h2>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Sélection renouvelée chaque jour selon votre profil (âge recherché, situation matrimoniale, foi, valeurs...).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedProfiles.map((item) => (
              <DiscoverProfileCard
                key={item.profile.id}
                item={item}
                canInteract={canInteract}
                onInspectProfile={(prof) => {
                  if (!canViewProfiles) {
                    setPremiumReason("consulter les profils");
                    setIsPremiumRequiredOpen(true);
                    return;
                  }
                  setSelectedProfile(prof);
                  setIsInspectorOpen(true);
                }}
                onToggleFavorite={handleToggleFavorite}
                onToggleLike={handleToggleLike}
                onSendMessage={handleSendMessage}
                onRequireVerification={handleRequireVerification}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !isError && otherProfilesTotalCount > 0 && (
        <div ref={otherProfilesSectionRef} className="space-y-3 scroll-mt-20">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Autres profils ({otherProfilesTotalCount})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherProfilesPageItems.map((item) => (
              <DiscoverProfileCard
                key={item.profile.id}
                item={item}
                canInteract={canInteract}
                onInspectProfile={(prof) => {
                  if (!canViewProfiles) {
                    setPremiumReason("consulter les profils");
                    setIsPremiumRequiredOpen(true);
                    return;
                  }
                  setSelectedProfile(prof);
                  setIsInspectorOpen(true);
                }}
                onToggleFavorite={handleToggleFavorite}
                onToggleLike={handleToggleLike}
                onSendMessage={handleSendMessage}
                onRequireVerification={handleRequireVerification}
              />
            ))}
          </div>

          <Pagination currentPage={otherProfilesPage} totalPages={otherProfilesTotalPages} onPageChange={handleOtherProfilesPageChange} />
        </div>
      )}

      <ProfileDrawerInspector
        item={selectedProfile}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onToggleFavorite={handleToggleFavorite}
        onToggleLike={handleToggleLike}
        onSendMessage={handleSendMessage}
        onViewLimitReached={() => {
          setPremiumReason("consulter les profils");
          setIsPremiumRequiredOpen(true);
        }}
      />

      <PremiumRequiredModal isOpen={isPremiumRequiredOpen} onClose={() => setIsPremiumRequiredOpen(false)} reason={premiumReason} />
      <VerificationRequiredModal isOpen={isVerificationRequiredOpen} onClose={() => setIsVerificationRequiredOpen(false)} reason={verificationReason} />
      <SendInvitationModal
        isOpen={!!pendingInvitation}
        onClose={cancelInvitation}
        onConfirm={confirmInvitation}
        firstName={pendingInvitation?.firstName ?? ""}
        isSending={isSendingInvitation}
      />
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={null}>
      <DiscoverPageContent />
    </Suspense>
  );
}
