"use client";

import { Suspense, useState, useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RecommendedProfileItem, DiscoverFilterCriteria } from "@/domain/types/discover";
import { discoverService } from "@/domain/services/discover.service";
import { PremiumRequiredError, VerificationRequiredError } from "@/domain/errors";
import { DiscoverProfileCard } from "@/components/features/discover/discover-profile-card";
import { FilterPanel } from "@/components/features/discover/filter-panel";
import { pickDailyRecommendations } from "@/domain/daily-recommendations";
import { ProfileDrawerInspector } from "@/components/features/discover/profile-drawer-inspector";
import { PremiumRequiredModal } from "@/components/features/premium/premium-required-modal";
import { VerificationRequiredModal } from "@/components/features/discover/verification-required-modal";
import { SendInvitationModal } from "@/components/features/messages/send-invitation-modal";
import { useSendInvitation } from "@/core/hooks/use-send-invitation";
import { SearchInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "@/core/providers/session-provider";
import { getScoringGaps } from "@/domain/profile-completeness";
import { Users, SlidersHorizontal, RefreshCw, CheckCircle2, AlertCircle, Heart, ArrowRight, Clock, ShieldAlert } from "lucide-react";

const DEFAULT_FILTERS: DiscoverFilterCriteria = { ageMin: 20, ageMax: 50, status: "ALL" };

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
  const [profiles, setProfiles] = useState<RecommendedProfileItem[]>([]);
  const [filters, setFilters] = useState<DiscoverFilterCriteria>(() => {
    const search = searchParams.get("search");
    return search ? { ...DEFAULT_FILTERS, searchQuery: search } : DEFAULT_FILTERS;
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

  const handleRequireVerification = (reason: string) => {
    setVerificationReason(reason);
    setIsVerificationRequiredOpen(true);
  };

  const fetchProfiles = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await discoverService.getProfiles(filters);
      setProfiles(data);
    } catch (err) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleToggleFavorite = async (profileId: string) => {
    setProfiles((prev) => prev.map((item) => (item.profile.id === profileId ? { ...item, isFavorite: !item.isFavorite } : item)));
    try {
      await discoverService.toggleFavorite(profileId);
    } catch (err) {
      setProfiles((prev) => prev.map((item) => (item.profile.id === profileId ? { ...item, isFavorite: !item.isFavorite } : item)));
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
    const target = profiles.find((p) => p.profile.id === profileId);
    requestInvitation(profileId, target?.profile.firstName ?? "ce membre");
  };

  // Exactement 3 profils "recommandés", tirés au sort pour la journée parmi
  // les meilleurs scores de compatibilité (âge recherché, situation
  // matrimoniale, foi, valeurs...) — stable pour ce membre toute la journée,
  // renouvelé automatiquement le lendemain. Le reste s'affiche en second,
  // jamais masqué.
  const { recommended: recommendedProfiles, others: otherProfiles } = pickDailyRecommendations(profiles, profile.id, 3);
  const bannerContent = !canInteract
    ? VERIFICATION_BANNER_CONTENT[profile.photo_verification_status as "UNVERIFIED" | "PENDING" | "REJECTED"]
    : null;

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
            placeholder="Rechercher par prénom, ville, profession..."
            value={filters.searchQuery || ""}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            onClear={() => setFilters({ ...filters, searchQuery: "" })}
            className="flex-1 md:w-72 text-xs h-10 bg-card shadow-2xs"
          />

          <Button
            variant={isFilterOpen ? "primary" : "outline"}
            size="md"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
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

      {isFilterOpen && (
        <div className="animate-in fade-in duration-150">
          <FilterPanel
            filters={filters}
            onChangeFilters={setFilters}
            onResetFilters={() => setFilters(DEFAULT_FILTERS)}
            isPremium={profile.subscription_status === "ACTIVE"}
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

      {!isLoading && !isError && scoringGaps.length > 0 && profiles.length > 0 && (
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

      {!isLoading && !isError && profiles.length === 0 && (
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
                  setSelectedProfile(prof);
                  setIsInspectorOpen(true);
                }}
                onToggleFavorite={handleToggleFavorite}
                onSendMessage={handleSendMessage}
                onRequireVerification={handleRequireVerification}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !isError && otherProfiles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Autres profils ({otherProfiles.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherProfiles.map((item) => (
              <DiscoverProfileCard
                key={item.profile.id}
                item={item}
                canInteract={canInteract}
                onInspectProfile={(prof) => {
                  setSelectedProfile(prof);
                  setIsInspectorOpen(true);
                }}
                onToggleFavorite={handleToggleFavorite}
                onSendMessage={handleSendMessage}
                onRequireVerification={handleRequireVerification}
              />
            ))}
          </div>
        </div>
      )}

      <ProfileDrawerInspector
        item={selectedProfile}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onToggleFavorite={handleToggleFavorite}
        onSendMessage={handleSendMessage}
        onViewLimitReached={() => {
          setPremiumReason("consulter plus de 10 profils ce mois-ci");
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
