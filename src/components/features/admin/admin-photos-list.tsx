"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { RejectPhotoModal } from "@/components/features/admin/reject-photo-modal";
import { approvePhotoAction, rejectPhotoAction } from "@/lib/actions/admin.actions";
import { computeAge } from "@/domain/badges";
import { Check, X, Image as ImageIcon, ExternalLink, Clock, Crown } from "lucide-react";
import type { ProfileRow } from "@/lib/supabase/database.types";

export interface AdminPhotoRow {
  photoId: string;
  userId: string;
  url: string;
  submittedAt: string;
  isPremium: boolean;
  profile: ProfileRow;
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

export function AdminPhotosList({ initialItems }: { initialItems: AdminPhotoRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [activeItem, setActiveItem] = useState<AdminPhotoRow | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const removeItem = (photoId: string) => {
    setItems((prev) => prev.filter((i) => i.photoId !== photoId));
    setActiveItem(null);
  };

  const handleApprove = (item: AdminPhotoRow) => {
    setError(null);
    startTransition(async () => {
      const result = await approvePhotoAction(item.photoId, item.userId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      removeItem(item.photoId);
    });
  };

  const handleReject = async (reason: string) => {
    if (!activeItem) return { error: "Photo introuvable." };
    const result = await rejectPhotoAction(activeItem.photoId, activeItem.userId, reason);
    if (!result?.error) removeItem(activeItem.photoId);
    return result;
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon size={22} />}
        title="Aucune photo en attente"
        description="Toutes les photos soumises par les membres ont été traitées."
      />
    );
  }

  return (
    <div className="space-y-3">
      {error && <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <button
            key={item.photoId}
            onClick={() => setActiveItem(item)}
            className="group text-left rounded-2xl border border-border/60 bg-card shadow-2xs overflow-hidden hover:border-accent/40 transition-colors"
          >
            <div className="relative aspect-square bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="w-full h-full object-cover" />
              {item.isPremium && (
                <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground shadow-2xs">
                  <Crown size={9} /> Premium
                </span>
              )}
            </div>
            <div className="p-2.5 flex items-center gap-2 min-w-0">
              <Avatar size="sm" src={item.profile.avatar_url ?? undefined} fallback={item.profile.first_name.charAt(0)} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {item.profile.first_name} {item.profile.last_name}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock size={9} /> {timeAgo(item.submittedAt)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Modal
        isOpen={Boolean(activeItem)}
        onClose={() => setActiveItem(null)}
        title={activeItem ? `${activeItem.profile.first_name} ${activeItem.profile.last_name}` : ""}
        description={activeItem ? `Photo soumise ${timeAgo(activeItem.submittedAt)}` : undefined}
        maxWidth="lg"
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
            {activeItem.isPremium && (
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-accent/10 text-accent text-xs font-medium">
                <Crown size={13} /> Membre premium
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Photo soumise</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeItem.url} alt="" className="w-full max-h-[28rem] object-contain rounded-2xl border border-border/60 bg-secondary" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
              <InfoField label="Âge" value={activeItem.profile.birth_date ? computeAge(activeItem.profile.birth_date) : null} />
              <InfoField label="Genre" value={activeItem.profile.gender === "MALE" ? "Homme" : "Femme"} />
              <InfoField label="Ville" value={activeItem.profile.city} />
              <InfoField label="Pays" value={activeItem.profile.country} />
              <InfoField label="Profession" value={activeItem.profile.profession} />
              <InfoField label="Confession" value={activeItem.profile.church_denomination} />
            </div>
          </div>
        )}
      </Modal>

      <RejectPhotoModal isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} memberName={activeItem?.profile.first_name ?? ""} onConfirm={handleReject} />
    </div>
  );
}
