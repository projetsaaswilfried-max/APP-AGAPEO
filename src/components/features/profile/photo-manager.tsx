"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Check, Trash2, AlertCircle, ShieldAlert, Clock3 } from "lucide-react";
import { FileSizeHint } from "@/components/ui/file-size-hint";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { uploadAvatar } from "@/lib/storage";
import { addProfilePhotoAction, removeProfilePhotoAction, setPrimaryPhotoAction } from "@/lib/actions/profile.actions";
import type { ProfilePhotoRow, VerificationStatus } from "@/lib/supabase/database.types";

interface PhotoManagerProps {
  userId: string;
  initialPhotos: ProfilePhotoRow[];
  photoVerificationStatus?: VerificationStatus;
  /** Utilisé par l'onboarding pour savoir si au moins une photo existe déjà (étape obligatoire). */
  onPhotosChange?: (photos: ProfilePhotoRow[]) => void;
}

/** Gestion des photos réutilisée par l'onboarding ET par "Mon Profil" (pour les ajouter/retirer à tout moment). */
export function PhotoManager({ userId, initialPhotos, photoVerificationStatus, onPhotosChange }: PhotoManagerProps) {
  const [photos, setPhotosState] = useState(initialPhotos);
  const setPhotos = (updater: ProfilePhotoRow[] | ((prev: ProfilePhotoRow[]) => ProfilePhotoRow[])) => {
    setPhotosState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      onPhotosChange?.(next);
      return next;
    });
  };
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPendingDelete, setPhotoPendingDelete] = useState<ProfilePhotoRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      const { url, path } = await uploadAvatar(userId, file);
      const isPrimary = photos.length === 0;
      const result = await addProfilePhotoAction(url, path, isPrimary);
      if (result.error) throw new Error(result.error);
      if (result.photo) setPhotos((prev) => [...prev, result.photo!]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'upload a échoué. Réessaie.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    setPhotos((prev) => prev.map((p) => ({ ...p, is_primary: p.id === photoId })));
    await setPrimaryPhotoAction(photoId);
  };

  const handleConfirmDelete = async () => {
    if (!photoPendingDelete) return;
    setIsDeleting(true);
    const photoId = photoPendingDelete.id;
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    await removeProfilePhotoAction(photoId);
    setIsDeleting(false);
    setPhotoPendingDelete(null);
  };

  const deletingPrimaryWhileVerified = photoPendingDelete?.is_primary && photoVerificationStatus === "VERIFIED";

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />

      {photoVerificationStatus === "PENDING" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700">
          <Clock3 size={15} className="shrink-0" />
          Profil en cours de vérification — notre équipe l&apos;examine, tu recevras un email dès que c&apos;est fait.
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden border border-border/60 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="Photo de profil" className="w-full h-full object-cover" />
            {/* Dégradé permanent (pas seulement au survol) pour que les
                boutons restent lisibles sur une photo claire — nécessaire
                puisqu'ils sont maintenant toujours visibles, y compris sur
                mobile où il n'y a pas de survol pour les révéler. */}
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
            {photo.is_primary ? (
              <div className="absolute top-1.5 left-1.5 p-1 rounded-full bg-accent text-accent-foreground shadow-2xs" title="Photo principale">
                <Check size={11} className="stroke-3" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSetPrimary(photo.id)}
                className="absolute top-1.5 left-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                title="Définir comme photo principale"
              >
                <Check size={11} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setPhotoPendingDelete(photo)}
              className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
          <span className="text-xs font-medium">{isUploading ? "Envoi..." : "Ajouter"}</span>
        </button>
      </div>

      <FileSizeHint maxSizeMb={15} formats="JPG, PNG, WEBP, GIF" />

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      <Modal
        isOpen={!!photoPendingDelete}
        onClose={() => setPhotoPendingDelete(null)}
        title="Supprimer cette photo ?"
        description={
          deletingPrimaryWhileVerified
            ? "C'est ta photo principale et ton profil est vérifié."
            : "Cette action est définitive."
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPhotoPendingDelete(null)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete} isLoading={isDeleting}>
              Supprimer
            </Button>
          </>
        }
      >
        {deletingPrimaryWhileVerified && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <p>
              Tu ne seras plus visible par les autres membres dans Découvrir dès que cette photo sera supprimée.
              Quand tu ajouteras une nouvelle photo principale, notre équipe devra revérifier ton profil avant qu&apos;il
              redevienne visible.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
