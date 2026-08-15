"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createOfficialPostAction, deleteOfficialPostAction } from "@/lib/actions/admin.actions";
import { uploadPostMedia, FileValidationError, PLATFORM_MAX_UPLOAD_BYTES } from "@/lib/storage";
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from "@/lib/youtube";
import { useSession } from "@/core/providers/session-provider";
import { Camera, Video, SquarePlay, AlertCircle, Trash2, X } from "lucide-react";
import type { PostRow } from "@/lib/supabase/database.types";

const PLATFORM_MAX_UPLOAD_MB = Math.round(PLATFORM_MAX_UPLOAD_BYTES / 1024 / 1024);

const CATEGORIES = [
  { value: "TEACHING", label: "Enseignement" },
  { value: "TESTIMONY", label: "Témoignage" },
  { value: "ADVICE", label: "Conseil" },
  { value: "ANNOUNCEMENT", label: "Annonce" },
  { value: "QUOTE", label: "Pensée & Citation" },
  { value: "VERSE", label: "Verset" },
  { value: "NEWS", label: "Nouveauté" }
];

interface AdminPostComposerProps {
  initialPosts: PostRow[];
}

export function AdminPostComposer({ initialPosts }: AdminPostComposerProps) {
  const { profile } = useSession();
  const [posts, setPosts] = useState(initialPosts);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("TEACHING");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isAddingYoutube, setIsAddingYoutube] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setVideoFile(null);
    setVideoPreview(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    // Vérification immédiate côté client : évite d'attendre la fin de
    // l'upload pour découvrir que le plan Supabase actuel le refusera.
    if (file.size > PLATFORM_MAX_UPLOAD_BYTES) {
      setError(
        `Cette vidéo fait ${(file.size / (1024 * 1024)).toFixed(0)} Mo. Le plan Supabase actuel plafonne les fichiers à ${PLATFORM_MAX_UPLOAD_MB} Mo, quelle que soit la configuration de l'app — passe à un plan payant sur supabase.com/dashboard pour uploader des vidéos plus volumineuses.`
      );
      return;
    }
    setImageFile(null);
    setImagePreview(null);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleYoutubeInputChange = (value: string) => {
    setYoutubeInput(value);
    setYoutubeVideoId(value.trim() ? extractYouTubeVideoId(value) : null);
  };

  const handleRemoveYoutube = () => {
    setIsAddingYoutube(false);
    setYoutubeInput("");
    setYoutubeVideoId(null);
  };

  const handlePublish = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    setUploadProgress(null);
    setError(null);
    try {
      let mediaUrl: string | undefined;
      let mediaStoragePath: string | undefined;
      let mediaKind: "IMAGE" | "VIDEO" | "YOUTUBE" | undefined;

      if (imageFile) {
        const uploaded = await uploadPostMedia(profile.id, `official-${Date.now()}`, imageFile, undefined, setUploadProgress);
        mediaUrl = uploaded.url;
        mediaStoragePath = uploaded.path;
        mediaKind = "IMAGE";
      } else if (videoFile) {
        const uploaded = await uploadPostMedia(
          profile.id,
          `official-${Date.now()}`,
          videoFile,
          PLATFORM_MAX_UPLOAD_BYTES,
          setUploadProgress,
          true // équipe éditoriale : message explicite sur le plan Supabase
        );
        mediaUrl = uploaded.url;
        mediaStoragePath = uploaded.path;
        mediaKind = "VIDEO";
      } else if (youtubeVideoId) {
        mediaUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
        mediaKind = "YOUTUBE";
      }

      const result = await createOfficialPostAction({ title: title || undefined, content, category, mediaKind, mediaUrl, mediaStoragePath });
      if (result.error) throw new Error(result.error);

      setTitle("");
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setVideoFile(null);
      setVideoPreview(null);
      handleRemoveYoutube();
      window.location.reload();
    } catch (err) {
      setError(err instanceof FileValidationError || err instanceof Error ? err.message : "La publication a échoué.");
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    await deleteOfficialPostAction(postId);
  };

  return (
    <div className="space-y-6">
      <Card variant="base">
        <CardHeader>
          <CardTitle>Publier dans le fil officiel</CardTitle>
          <CardDescription>Visible par tous les membres dans Accueil. Réservé à l&apos;équipe éditoriale.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Titre (optionnel)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Catégorie</label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                wrapperWidth="full"
                className="h-11 rounded-xl border-border pl-3.5 pr-9 text-sm focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Contenu</label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={3000} />
          </div>

          <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
          <input type="file" ref={videoInputRef} accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoChange} className="hidden" />

          {imagePreview && (
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {videoPreview && (
            <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-border bg-black">
              <video src={videoPreview} controls className="w-full max-h-64" />
              <button
                type="button"
                onClick={() => {
                  setVideoFile(null);
                  setVideoPreview(null);
                }}
                className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full"
              >
                <X size={12} />
              </button>
              {videoFile && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {(videoFile.size / (1024 * 1024)).toFixed(1)} Mo (max {PLATFORM_MAX_UPLOAD_MB} Mo sur le plan Supabase actuel)
                </p>
              )}
            </div>
          )}

          {isAddingYoutube && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeInput}
                  onChange={(e) => handleYoutubeInputChange(e.target.value)}
                  className="text-sm h-10"
                />
                <button
                  type="button"
                  onClick={handleRemoveYoutube}
                  className="shrink-0 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"
                >
                  <X size={16} />
                </button>
              </div>
              {youtubeInput.trim() && !youtubeVideoId && (
                <p className="text-[11px] text-destructive">Lien YouTube non reconnu — vérifie l&apos;URL.</p>
              )}
              {youtubeVideoId && (
                <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-border bg-black aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getYouTubeThumbnailUrl(youtubeVideoId)}
                    alt="Aperçu YouTube"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {!imagePreview && !videoPreview && !isAddingYoutube && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} leftIcon={<Camera size={15} />}>
                Ajouter une image
              </Button>
              <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} leftIcon={<Video size={15} />}>
                Ajouter une vidéo
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsAddingYoutube(true)} leftIcon={<SquarePlay size={15} />}>
                Ajouter une vidéo YouTube
              </Button>
            </div>
          )}

          {isSaving && (imageFile || videoFile) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Envoi en cours{videoFile ? " — ne ferme pas cette page" : ""}...</span>
                <span className="font-mono">{uploadProgress ?? 0}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-150"
                  style={{ width: `${uploadProgress ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handlePublish}
              isLoading={isSaving}
              disabled={!content.trim() || Boolean(youtubeInput.trim() && !youtubeVideoId)}
            >
              Publier
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="base">
        <CardHeader>
          <CardTitle>Publications officielles ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {posts.length === 0 && <p className="text-xs text-muted-foreground">Aucune publication officielle pour le moment.</p>}
          {posts.map((post) => (
            <div key={post.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/60">
              <div className="min-w-0">
                {post.title && <p className="text-sm font-semibold text-foreground">{post.title}</p>}
                <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(post.id)} leftIcon={<Trash2 size={13} />}>
                Supprimer
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
