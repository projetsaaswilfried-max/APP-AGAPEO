import { createClient } from "@/lib/supabase/client";
import { env } from "@/config/env";

export class FileValidationError extends Error {}

/**
 * Plafond RÉEL des fichiers uploadés sur ce projet Supabase — pas une limite
 * de bucket ou de code, mais celle du plan Supabase (Free = 50 Mo par
 * fichier, quelle que soit la policy du bucket). Vérifié via l'API Management
 * (`PATCH /config/storage` renvoie 402 au-delà). Passer un plan payant relève
 * ce plafond côté Supabase (jusqu'à plusieurs Go) — aucune valeur ici ne peut
 * la contourner.
 */
export const PLATFORM_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Upload direct (XHR) avec suivi de progression réelle — supabase-js
 * n'expose pas d'évènement de progression sur `.upload()`.
 *
 * `explainPlatformLimit` : le dépassement de taille (413) vient d'une
 * limite du PLAN Supabase, une info interne qui ne regarde que l'équipe
 * (cf. espace admin) — un membre publiant depuis son espace personnel ne
 * doit voir que le chiffre réel, jamais de mention d'abonnement/plan.
 */
function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
  explainPlatformLimit = false
): Promise<void> {
  return new Promise((resolve, reject) => {
    (async () => {
      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) {
        reject(new Error("Session expirée."));
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${env.supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(path)}`);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("apikey", env.supabaseAnonKey);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.setRequestHeader("x-upsert", "false");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }
        const maxMb = Math.round(PLATFORM_MAX_UPLOAD_BYTES / 1024 / 1024);
        let message = `Échec de l'upload (code ${xhr.status}).`;
        if (xhr.status === 413) {
          message = explainPlatformLimit
            ? `Ce fichier dépasse la taille maximale autorisée par le plan Supabase actuel (${maxMb} Mo). Passe à un plan payant sur supabase.com pour uploader des fichiers plus volumineux.`
            : `Ce fichier dépasse la taille maximale autorisée (${maxMb} Mo).`;
        } else {
          try {
            const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
            message = parsed.message || parsed.error || message;
          } catch {
            // Réponse non-JSON : on garde le message générique.
          }
        }
        reject(new Error(message));
      };
      xhr.onerror = () => reject(new Error("Échec de l'upload : problème réseau."));
      xhr.send(file);
    })();
  });
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip"
];

export function validateImageFile(file: File, maxBytes = 15 * 1024 * 1024) {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new FileValidationError("Format d'image non supporté (JPG, PNG, WEBP ou GIF uniquement).");
  }
  if (file.size > maxBytes) {
    throw new FileValidationError(`L'image dépasse la taille maximale autorisée de ${Math.round(maxBytes / 1024 / 1024)} Mo.`);
  }
}

export function validateVideoFile(file: File, maxBytes = 100 * 1024 * 1024) {
  if (!VIDEO_TYPES.includes(file.type)) {
    throw new FileValidationError("Format vidéo non supporté (MP4, WEBM ou MOV uniquement).");
  }
  if (file.size > maxBytes) {
    throw new FileValidationError(`La vidéo dépasse la taille maximale autorisée de ${Math.round(maxBytes / 1024 / 1024)} Mo.`);
  }
}

export function validateDocumentFile(file: File, maxBytes = 25 * 1024 * 1024) {
  if (!DOCUMENT_TYPES.includes(file.type)) {
    throw new FileValidationError("Type de document non supporté.");
  }
  if (file.size > maxBytes) {
    throw new FileValidationError(`Le document dépasse la taille maximale autorisée de ${Math.round(maxBytes / 1024 / 1024)} Mo.`);
  }
}

function slugifyFileName(name: string) {
  const dotIndex = name.lastIndexOf(".");
  const ext = dotIndex >= 0 ? name.slice(dotIndex) : "";
  const base = (dotIndex >= 0 ? name.slice(0, dotIndex) : name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .slice(0, 60);
  return `${Date.now()}-${base}${ext}`;
}

export async function uploadAvatar(userId: string, file: File) {
  validateImageFile(file);
  const supabase = createClient();
  const path = `${userId}/${slugifyFileName(file.name)}`;

  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
  if (error) throw new Error(`Échec de l'upload de la photo : ${error.message}`);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * `videoMaxBytes` : plafond appliqué à la validation côté client — laisser
 * vide utilise le défaut de `validateVideoFile`. Le vrai plafond reste de
 * toute façon celui du plan Supabase (`PLATFORM_MAX_UPLOAD_BYTES`), quoi que
 * ce paramètre autorise : le bucket `post-media` n'a plus de limite propre,
 * mais le plan Supabase, lui, en impose une (cf. erreur 402 constatée).
 *
 * `explainPlatformLimit` : réservé à l'espace admin (équipe éditoriale) —
 * un membre publiant depuis son profil ne doit jamais voir de mention de
 * plan/abonnement Supabase, seulement la taille maximale réelle.
 */
export async function uploadPostMedia(
  userId: string,
  postId: string,
  file: File,
  videoMaxBytes?: number,
  onProgress?: (percent: number) => void,
  explainPlatformLimit = false
) {
  if (file.type.startsWith("video/")) {
    validateVideoFile(file, videoMaxBytes);
  } else {
    validateImageFile(file);
  }
  const supabase = createClient();
  const path = `${userId}/${postId}/${slugifyFileName(file.name)}`;

  await uploadWithProgress("post-media", path, file, onProgress, explainPlatformLimit);

  const { data } = supabase.storage.from("post-media").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export type MessageAttachmentKind = "IMAGE" | "VIDEO" | "DOCUMENT";

export async function uploadMessageFile(conversationId: string, file: File, kind: MessageAttachmentKind) {
  if (kind === "IMAGE") validateImageFile(file);
  if (kind === "VIDEO") validateVideoFile(file);
  if (kind === "DOCUMENT") validateDocumentFile(file);

  const supabase = createClient();
  const path = `${conversationId}/${slugifyFileName(file.name)}`;

  const { error } = await supabase.storage.from("message-attachments").upload(path, file, { upsert: false });
  if (error) throw new Error(`Échec de l'envoi de la pièce jointe : ${error.message}`);

  return { path };
}

export async function uploadSupportImage(ticketId: string, file: File) {
  validateImageFile(file);

  const supabase = createClient();
  const path = `${ticketId}/${slugifyFileName(file.name)}`;

  const { error } = await supabase.storage.from("support-attachments").upload(path, file, { upsert: false });
  if (error) throw new Error(`Échec de l'envoi de l'image : ${error.message}`);

  return { path };
}

/** Génère des URLs signées à la lecture — jamais stockées telles quelles en base (elles expirent). */
export async function getSignedAttachmentUrls(bucket: string, paths: string[], expiresInSeconds = 3600) {
  if (paths.length === 0) return {} as Record<string, string>;

  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresInSeconds);
  if (error || !data) {
    console.error("Échec de génération des URLs signées pour les pièces jointes :", error);
    return {} as Record<string, string>;
  }

  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.error) {
      console.error(`Échec de signature pour ${item.path} :`, item.error);
    }
    if (item.signedUrl && item.path) {
      map[item.path] = item.signedUrl;
    }
  }
  return map;
}
