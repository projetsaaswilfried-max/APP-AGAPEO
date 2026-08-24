"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RecommendedProfileItem } from "@/domain/types/discover";
import { discoverService } from "@/domain/services/discover.service";
import { DiscoverProfileCard } from "@/components/features/discover/discover-profile-card";
import { ProfileDrawerInspector } from "@/components/features/discover/profile-drawer-inspector";
import { PremiumRequiredModal } from "@/components/features/premium/premium-required-modal";
import { VerificationRequiredModal } from "@/components/features/discover/verification-required-modal";
import { SendInvitationModal } from "@/components/features/messages/send-invitation-modal";
import { useSendInvitation } from "@/core/hooks/use-send-invitation";
import { VerificationRequiredError } from "@/domain/errors";
import { SearchInput } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/core/providers/session-provider";
import { Bookmark, Users } from "lucide-react";

export function AccountFavorites() {
  const router = useRouter();
  const { profile } = useSession();
  const canInteract = profile.photo_verification_status === "VERIFIED" || profile.is_staff;
  const [favorites, setFavorites] = useState<RecommendedProfileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<RecommendedProfileItem | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isPremiumRequiredOpen, setIsPremiumRequiredOpen] = useState(false);
  const [premiumReason, setPremiumReason] = useState("consulter plus de 10 profils ce mois-ci");
  const [isVerificationRequiredOpen, setIsVerificationRequiredOpen] = useState(false);
  const [verificationReason, setVerificationReason] = useState("contacter ce membre");

  const handleRequireVerification = (reason: string) => {
    setVerificationReason(reason);
    setIsVerificationRequiredOpen(true);
  };

  useEffect(() => {
    discoverService
      .getFavorites()
      .then(setFavorites)
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggleFavorite = async (profileId: string) => {
    setFavorites((prev) => prev.filter((item) => item.profile.id !== profileId));
    try {
      await discoverService.toggleFavorite(profileId);
    } catch (err) {
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
    onError: (message) => console.error(message)
  });

  const handleSendMessage = (profileId: string) => {
    const target = favorites.find((item) => item.profile.id === profileId);
    requestInvitation(profileId, target?.profile.firstName ?? "ce membre");
  };

  const filtered = favorites.filter((item) =>
    searchQuery ? `${item.profile.firstName} ${item.profile.lastName} ${item.profile.city}`.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-accent fill-current" />
          <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
            Mes Profils Enregistrés dans les Favoris ({filtered.length})
          </h2>
        </div>
        <SearchInput
          placeholder="Rechercher dans mes favoris..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
          className="w-full sm:w-64 text-xs h-9 bg-secondary/50"
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={<Users size={24} />}
          title="Aucun profil enregistré dans tes favoris"
          description="Tu peux ajouter des profils en favoris depuis l'espace Découvrir pour les retrouver rapidement."
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
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
    </Card>
  );
}
