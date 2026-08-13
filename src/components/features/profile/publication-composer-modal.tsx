"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { FileSizeHint } from "@/components/ui/file-size-hint";
import { validateImageFile, validateVideoFile, FileValidationError, PLATFORM_MAX_UPLOAD_BYTES } from "@/lib/storage";

const PLATFORM_MAX_UPLOAD_MB = Math.round(PLATFORM_MAX_UPLOAD_BYTES / 1024 / 1024);
import { feedService } from "@/domain/services/feed.service";
import { ImageIcon, Video, X, AlertCircle } from "lucide-react";
import type { FeedPublication } from "@/domain/types/feed";

interface PublicationComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Présent = édition d'une publication existante ; absent = création. */
  editingPublication?: FeedPublication | null;
  onCreated?: (publication: FeedPublication) => void;
  onUpdated?: (publication: FeedPublication) => void;
}

export function PublicationComposerModal({
  isOpen,
  onClose,
  editingPublication,
  onCreated,
  onUpdated
}: PublicationComposerModalProps) {
  const isEditing = Boolean(editingPublication);
  const [title, setTitle] = useState(editingPublication?.title ?? "");
  const [content, setContent] = useState(editingPublication?.content ?? "");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(
    editingPublication?.images?.[0]?.url ?? editingPublication?.videoUrl ?? null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const resetAndClose = () => {
    setTitle("");
    setContent("");
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setExistingMediaUrl(null);
    setError(null);
    onClose();
  };

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      validateImageFile(file);
      setMediaFile(file);
      setMediaPreviewUrl(URL.createObjectURL(file));
      setExistingMediaUrl(null);
      setError(null);
    } catch (err) {
      setError(err instanceof FileValidationError ? err.message : "Fichier invalide.");
    }
  };

  const handlePickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      validateVideoFile(file, PLATFORM_MAX_UPLOAD_BYTES);
      setMediaFile(file);
      setMediaPreviewUrl(URL.createObjectURL(file));
      setExistingMediaUrl(null);
      setError(null);
    } catch (err) {
      setError(err instanceof FileValidationError ? err.message : "Fichier invalide.");
    }
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setExistingMediaUrl(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      if (isEditing && editingPublication) {
        const removeMedia = !existingMediaUrl && !mediaFile && Boolean(editingPublication.images?.length || editingPublication.videoUrl);
        const updated = await feedService.updatePersonalPublication(editingPublication.id, {
          title: title.trim() || undefined,
          content: content.trim(),
          mediaFile: mediaFile ?? undefined,
          removeMedia
        });
        onUpdated?.(updated);
      } else {
        const created = await feedService.createPersonalPublication({
          title: title.trim() || undefined,
          content: content.trim(),
          mediaFile: mediaFile ?? undefined
        });
        onCreated?.(created);
      }
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "La publication a échoué.");
    } finally {
      setIsSaving(false);
    }
  };

  const previewUrl = mediaPreviewUrl ?? existingMediaUrl;
  const isVideoPreview = mediaFile?.type.startsWith("video/") || (!!editingPublication?.videoUrl && !mediaFile && !!existingMediaUrl);

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={isEditing ? "Modifier ma publication" : "Créer une pensée personnelle"}
      description="Visible uniquement par les membres qui visitent ton profil — jamais dans le fil officiel."
      maxWidth="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={resetAndClose}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!content.trim()} isLoading={isSaving}>
            {isEditing ? "Enregistrer les modifications" : "Publier sur mon profil"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Titre (optionnel)" placeholder="Ex : Réflexion du soir..." value={title} onChange={(e) => setTitle(e.target.value)} />

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Contenu</label>
          <div className="relative">
            <Textarea
              placeholder="Partage une réflexion spirituelle, un verset inspirant... 🙏"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={600}
              className="pr-10"
            />
            <EmojiPicker onSelect={(emoji) => setContent((prev) => prev + emoji)} className="absolute bottom-3 right-3" />
          </div>
        </div>

        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePickImage} className="hidden" />
        <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handlePickVideo} className="hidden" />

        {previewUrl ? (
          <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center max-h-72">
            {isVideoPreview ? (
              <video src={previewUrl} controls className="w-full max-h-72" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Aperçu" className="w-full h-auto max-h-72 object-contain" />
            )}
            <button
              type="button"
              onClick={handleRemoveMedia}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              title="Retirer le média"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} leftIcon={<ImageIcon size={14} />}>
              Ajouter une image
            </Button>
            <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} leftIcon={<Video size={14} />}>
              Ajouter une vidéo
            </Button>
          </div>
        )}

        <FileSizeHint
          maxSizeMb={mediaFile?.type.startsWith("video/") ? PLATFORM_MAX_UPLOAD_MB : 15}
          formats={`Image (15 Mo) ou Vidéo (${PLATFORM_MAX_UPLOAD_MB} Mo)`}
        />

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
