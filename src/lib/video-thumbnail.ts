/**
 * Capture une image de la première seconde d'un fichier vidéo local pour
 * servir de poster <video> — un membre a remonté que les vidéos du fil
 * restent un simple rectangle noir tant qu'on n'appuie pas dessus : la
 * cause est qu'aucune miniature (`video_thumbnail`) n'était jamais générée
 * pour les vidéos uploadées directement (seul YouTube en avait une).
 */
export function generateVideoThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Délai dépassé pour générer la miniature vidéo."));
    }, 10000);

    video.addEventListener("loadedmetadata", () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        video.currentTime = 0;
        return;
      }
      video.currentTime = Math.min(1, video.duration / 10);
    });

    video.addEventListener("seeked", () => {
      clearTimeout(timeoutId);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx || canvas.width === 0 || canvas.height === 0) {
        cleanup();
        reject(new Error("Impossible de générer la miniature (dimensions vidéo indisponibles)."));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) resolve(blob);
          else reject(new Error("Échec de génération de la miniature."));
        },
        "image/jpeg",
        0.85
      );
    });

    video.addEventListener("error", () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error("Impossible de lire le fichier vidéo pour générer la miniature."));
    });
  });
}
