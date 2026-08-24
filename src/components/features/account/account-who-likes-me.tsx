"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserProfile } from "@/domain/types/user";
import { RecommendedProfileItem } from "@/domain/types/discover";
import { discoverService } from "@/domain/services/discover.service";
import { messageService } from "@/domain/services/message.service";
import { PremiumRequiredError, VerificationRequiredError } from "@/domain/errors";
import { DiscoverProfileCard } from "@/components/features/discover/discover-profile-card";
import { ProfileDrawerInspector } from "@/components/features/discover/profile-drawer-inspector";
import { PremiumRequiredModal } from "@/components/features/premium/premium-required-modal";
import { VerificationRequiredModal } from "@/components/features/discover/verification-required-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/core/providers/session-provider";
import { Heart, Crown } from "lucide-react";

interface AccountWhoLikesMeProps {
  profile: UserProfile;
}

export function AccountWhoLikesMe({ profile }: AccountWhoLikesMeProps) {
  const router = useRouter();
  const { profile: sessionProfile } = useSession();
  const canInteract = sessionProfile.photo_verification_status === "VERIFIED" || sessionProfile.is_staff;
  const isPremium = profile.subscriptionStatus === "ACTIVE";
  const [items, setItems] = useState<RecommendedProfileItem[]>([]);
  // Le nombre reste visible pour tous — seul `items` (l'identité de chacun)
  // est réservé Premium/équipe côté service (getWhoLikesMe renvoie [] sinon).
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<RecommendedProfileItem | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isPremiumRequiredOpen, setIsPremiumRequiredOpen] = useState(false);
  const [premiumReason, setPremiumReason] = useState("contacter ce membre en premier");
  const [isVerificationRequiredOpen, setIsVerificationRequiredOpen] = useState(false);
  const [verificationReason, setVerificationReason] = useState("contacter ce membre");

  const handleRequireVerification = (reason: string) => {
    setVerificationReason(reason);
    setIsVerificationRequiredOpen(true);
  };

  useEffect(() => {
    Promise.all([discoverService.getWhoLikesMe(), discoverService.getWhoLikesMeCount()])
      .then(([detail, total]) => {
        setItems(detail);
        setCount(total);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggleFavorite = async (profileId: string) => {
    setItems((prev) => prev.map((item) => (item.profile.id === profileId ? { ...item, isFavorite: !item.isFavorite } : item)));
    try {
      await discoverService.toggleFavorite(profileId);
    } catch (err) {
      setItems((prev) => prev.map((item) => (item.profile.id === profileId ? { ...item, isFavorite: !item.isFavorite } : item)));
      if (err instanceof PremiumRequiredError) {
        setPremiumReason("mettre des profils en favori");
        setIsPremiumRequiredOpen(true);
        return;
      }
      if (err instanceof VerificationRequiredError) {
        handleRequireVerification("mettre ce membre en favori");
      }
    }
  };

  const handleSendMessage = async (profileId: string) => {
    try {
      const conversationId = await messageService.getOrCreateConversation(profileId);
      router.push(`/messages?conversation=${conversationId}`);
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        setPremiumReason("contacter ce membre en premier");
        setIsPremiumRequiredOpen(true);
        return;
      }
      if (err instanceof VerificationRequiredError) {
        handleRequireVerification("contacter ce membre");
        return;
      }
      console.error(err);
    }
  };

  return (
    <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs select-none">
      <div className="flex items-center gap-2 border-b border-border/60 pb-4">
        <Heart className="h-5 w-5 text-primary" />
        <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
          Qui s&apos;intéresse à moi {!isLoading && `(${count})`}
        </h2>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      )}

      {!isLoading && count === 0 && (
        <EmptyState
          icon={<Heart size={24} />}
          title="Personne pour l'instant"
          description="Dès qu'un membre consulte ou met ton profil en favori, il apparaîtra ici."
        />
      )}

      {!isLoading && count > 0 && !isPremium && (
        <div className="relative">
          {/* Identite jamais transmise en gratuit (voir getWhoLikesMe cote service) — le flou porte sur des cartes generiques, pas sur de vraies donnees. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 blur-sm pointer-events-none select-none" aria-hidden>
            {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-3xl" />
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Crown size={24} />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {count} membre{count > 1 ? "s" : ""} s&apos;intéresse{count > 1 ? "nt" : ""} à toi
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">Passe Premium pour découvrir qui a consulté ou favori ton profil.</p>
            <Link href="/premium">
              <Button variant="primary" size="sm" leftIcon={<Crown size={15} />}>
                Découvrir Premium
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!isLoading && items.length > 0 && isPremium && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
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
    </Card>
  );
}
