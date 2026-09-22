"use client";

import type { FFmpeg } from "@ffmpeg/ffmpeg";

/**
 * Convertit un enregistrement vocal (WebM/Opus, produit par Chrome/Firefox)
 * en AAC/M4A — le seul format lisible à la fois par tous les navigateurs ET
 * nativement par l'app mobile (iOS/Android ne savent pas décoder WebM).
 * Safari enregistre déjà nativement en MP4/AAC : cette fonction n'est jamais
 * appelée dans ce cas (cf. use-voice-recorder.ts).
 *
 * Tourne entièrement dans le navigateur via ffmpeg.wasm, chargé à la demande
 * (le binaire ~25 Mo n'est téléchargé qu'au moment d'envoyer une première
 * note vocale, jamais au chargement de l'app) et mis en cache par le
 * navigateur pour les envois suivants.
 */

// Build fixe (non multi-thread) : ne nécessite pas les en-têtes
// Cross-Origin-Opener-Policy/Cross-Origin-Embedder-Policy que le reste du
// site n'a pas — cf. le commentaire sur la CSP dans next.config.ts.
const FFMPEG_CORE_BASE_URL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm")
      });
      return ffmpeg;
    })().catch((err) => {
      // Un chargement raté ne doit pas laisser la promesse "en échec" en
      // mémoire pour le reste de la session — le prochain appel retente.
      ffmpegPromise = null;
      throw err;
    });
  }
  return ffmpegPromise;
}

export class AudioTranscodeError extends Error {}

export async function transcodeToAac(blob: Blob, sourceMimeType: string): Promise<Blob> {
  const ffmpeg = await getFFmpeg().catch((err) => {
    throw new AudioTranscodeError(err instanceof Error ? err.message : "Chargement du convertisseur audio impossible.");
  });

  // Le nom d'entrée porte la vraie extension du conteneur : ffmpeg identifie
  // le démuxeur à partir d'elle, pas du contenu du Blob.
  const sourceExtension = sourceMimeType.includes("ogg") ? "ogg" : "webm";
  const inputName = `input.${sourceExtension}`;
  const outputName = "output.m4a";

  try {
    const { fetchFile } = await import("@ffmpeg/util");
    await ffmpeg.writeFile(inputName, await fetchFile(blob));
    await ffmpeg.exec(["-i", inputName, "-vn", "-c:a", "aac", "-b:a", "96k", outputName]);
    const data = await ffmpeg.readFile(outputName);
    if (!(data instanceof Uint8Array) || data.byteLength === 0) {
      throw new AudioTranscodeError("La conversion audio a produit un fichier vide.");
    }
    return new Blob([new Uint8Array(data)], { type: "audio/mp4" });
  } finally {
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
