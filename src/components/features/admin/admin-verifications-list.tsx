"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { RejectVerificationModal } from "@/components/features/admin/reject-verification-modal";
import { approveVerificationRequestAction, rejectVerificationRequestAction } from "@/lib/actions/admin.actions";
import { computeAge } from "@/domain/badges";
import { Check, X, ShieldCheck, Crown, ExternalLink, Clock, ScanFace } from "lucide-react";
import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";

export interface AdminVerificationRow {
  requestId: string;
  userId: string;
  isPriority: boolean;
  submittedAt: string;
  profile: ProfileRow;
  photos: ProfilePhotoRow[];
  /** URL signée (expire) du selfie live pris à la soumission — null pour une ancienne demande antérieure à cette exigence. */
  selfieUrl: string | null;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function InfoField({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="text-xs text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export function AdminVerificationsList({ initialItems }: { initialItems: AdminVerificationRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [activeItem, setActiveItem] = useState<AdminVerificationRow | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const removeItem = (requestId: string) => {
    setItems((prev) => prev.filter((i) => i.requestId !== requestId));
    setActiveItem(null);
  };

  const handleApprove = (item: AdminVerificationRow) => {
    setError(null);
    startTransition(async () => {
      const result = await approveVerificationRequestAction(item.requestId, item.userId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      removeItem(item.requestId);
    });
  };

  const handleReject = async (reason: string) => {
    if (!activeItem) return { error: "Dossier introuvable." };
    const result = await rejectVerificationRequestAction(activeItem.requestId, activeItem.userId, reason);
    if (!result?.error) removeItem(activeItem.requestId);
    return result;
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck size={22} />}
        title="Aucune vérification en attente"
        description="Toutes les demandes de vérification de profil ont été traitées."
      />
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">{error}</div>
      )}

      {items.map((item) => (
        <button
          key={item.requestId}
          onClick={() => setActiveItem(item)}
          className="w-full flex flex-wrap items-center justify-between gap-3 p-3 bg-card border border-border/60 rounded-2xl shadow-2xs text-left hover:border-accent/40 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar size="md" src={item.profile.avatar_url ?? undefined} fallback={item.profile.first_name.charAt(0)} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.profile.first_name} {item.profile.last_name}
                </p>
                {item.isPriority && (
                  <Badge variant="verified" className="text-[9px] px-1.5 py-0 gap-0.5">
                    <Crown size={10} /> Premium
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock size={10} /> Soumis {timeAgo(item.submittedAt)} · {item.profile.country}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-medium text-accent shrink-0">Voir le dossier →</span>
        </button>
      ))}

      <Modal
        isOpen={Boolean(activeItem)}
        onClose={() => setActiveItem(null)}
        title={activeItem ? `${activeItem.profile.first_name} ${activeItem.profile.last_name}` : ""}
        description={activeItem ? `Soumis ${timeAgo(activeItem.submittedAt)}` : undefined}
        maxWidth="xl"
        footer={
          activeItem && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full">
              <Link
                href={`/profile/${activeItem.userId}`}
                target="_blank"
                className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 order-first basis-full sm:basis-auto sm:mr-auto"
              >
                <ExternalLink size={13} /> Voir le profil complet
              </Link>
              <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setIsRejectOpen(true)}
                  leftIcon={<X size={13} />}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Refuser
                </Button>
                <Button variant="primary" size="sm" disabled={isPending} onClick={() => handleApprove(activeItem)} leftIcon={<Check size={13} />}>
                  Valider
                </Button>
              </div>
            </div>
          )
        }
      >
        {activeItem && (
          <div className="space-y-5">
            {activeItem.isPriority && (
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-accent/10 text-accent text-xs font-medium">
                <Crown size={13} /> Membre premium — SLA de traitement sous 24h
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ScanFace size={13} /> Selfie de vérification (à comparer aux photos ci-dessous)
              </p>
              {activeItem.selfieUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeItem.selfieUrl}
                  alt="Selfie de vérification"
                  className="w-32 sm:w-40 aspect-square object-cover rounded-2xl border-2 border-accent/50 shadow-soft"
                />
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700">
                  Aucun selfie fourni — demande soumise avant la mise en place de cette exigence.
                </div>
              )}
            </div>

            {activeItem.photos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Photos de profil postées</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {activeItem.photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p.id} src={p.url} alt="" className="w-full aspect-square object-cover rounded-xl border border-border/60" />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoField label="Âge" value={activeItem.profile.birth_date ? computeAge(activeItem.profile.birth_date) : null} />
              <InfoField label="Genre" value={activeItem.profile.gender === "MALE" ? "Homme" : "Femme"} />
              <InfoField label="Ville" value={activeItem.profile.city} />
              <InfoField label="Pays" value={activeItem.profile.country} />
              <InfoField label="Profession" value={activeItem.profile.profession} />
              <InfoField label="Niveau d'études" value={activeItem.profile.education_level} />
            </div>

            <div className="space-y-3 pt-3 border-t border-border/60">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Ma foi</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoField label="Confession" value={activeItem.profile.church_denomination} />
                <InfoField label="Engagement" value={activeItem.profile.faith_engagement_level} />
                <InfoField label="Baptisé(e)" value={activeItem.profile.baptized ? "Oui" : "Non"} />
              </div>
              <InfoField label="Témoignage" value={activeItem.profile.testimony} />
            </div>

            <div className="space-y-3 pt-3 border-t border-border/60">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Vision du mariage</p>
              <InfoField label="Pourquoi le mariage" value={activeItem.profile.why_marriage} />
              <InfoField label="Vision du couple" value={activeItem.profile.couple_vision} />
            </div>

            {activeItem.profile.bio && (
              <div className="space-y-1 pt-3 border-t border-border/60">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Bio</p>
                <p className="text-xs text-foreground/90">{activeItem.profile.bio}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <RejectVerificationModal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        memberName={activeItem?.profile.first_name ?? ""}
        onConfirm={handleReject}
      />
    </div>
  );
}
