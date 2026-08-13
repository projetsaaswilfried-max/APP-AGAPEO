"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Star, Trash2, AlertCircle } from "lucide-react";
import { FileSizeHint } from "@/components/ui/file-size-hint";
import { uploadAvatar } from "@/lib/storage";
import { addProfilePhotoAction, removeProfilePhotoAction } from "@/lib/actions/profile.actions";
import type { ProfilePhotoRow } from "@/lib/supabase/database.types";

interface PhotoManagerProps {
  userId: string;
  initialPhotos: ProfilePhotoRow[];
}

/** Gestion des photos réutilisée par l'onboarding ET par "Mon Profil" (pour les ajouter/retirer à tout moment). */
export function PhotoManager({ userId, initialPhotos }: PhotoManagerProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    const photo = photos.find((p) => p.id === photoId);
    if (photo) await addProfilePhotoAction(photo.url, photo.storage_path, true);
  };

  const handleRemove = async (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    await removeProfilePhotoAction(photoId);
  };

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden border border-border/60 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="Photo de profil" className="w-full h-full object-cover" />
            {photo.is_primary ? (
              <div className="absolute top-1.5 left-1.5 p-1 rounded-full bg-accent text-accent-foreground shadow-2xs" title="Photo principale">
                <Star size={11} className="fill-current" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSetPrimary(photo.id)}
                className="absolute top-1.5 left-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Définir comme photo principale"
              >
                <Star size={11} />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRemove(photo.id)}
              className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
    </div>
  );
}
