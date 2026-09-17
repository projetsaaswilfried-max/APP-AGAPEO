import { useEffect, useRef, useState } from "react";
import { uploadVerificationSelfie } from "@/lib/storage";

export type SelfieCaptureStatus = "requesting" | "live" | "captured" | "uploading" | "error";

interface UseSelfieCaptureOptions {
  userId: string;
  /** Contrôle le cycle de vie de la caméra — flux ouvert seulement pendant que c'est vrai (modale ouverte, étape montée). */
  active: boolean;
  /** Best-effort : journalise un refus de caméra pour l'entonnoir d'onboarding, sans jamais bloquer le flux si ça échoue. */
  onCameraDenied?: () => void;
}

// Certains navigateurs in-app (Instagram/Facebook/TikTok ouverts depuis un
// lien de bio) et d'anciennes WebViews Android ne posent jamais la question
// d'autorisation : `getUserMedia` reste alors en attente indéfiniment, sans
// jamais résoudre ni rejeter. Sans ce filet, la personne restait bloquée sur
// le spinner "requesting" pour toujours, sans le moindre message ni bouton
// "Réessayer" — cf. investigation du 2026-09-18 : 801 comptes sur 5679 ayant
// vu l'étape selfie n'avaient déclenché ni capture réussie ni refus de
// caméra, un blocage silencieux qu'aucun des deux événements ne pouvait
// expliquer.
const CAMERA_TIMEOUT_MS = 15000;

/** Message adapté au type d'erreur réel plutôt qu'un seul message générique qui ne correspond pas toujours à la vraie cause. */
function classifyCameraError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Autorise l'accès à la caméra dans les réglages de ton navigateur pour continuer.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "Aucune caméra détectée sur cet appareil.";
      case "NotReadableError":
      case "TrackStartError":
        return "Impossible d'accéder à la caméra. Vérifie qu'aucune autre application (ou un autre onglet) ne l'utilise, puis réessaie.";
    }
  }
  return "Impossible d'accéder à la caméra. Vérifie qu'aucune autre application ne l'utilise, puis réessaie.";
}

/**
 * Capture caméra en direct uniquement — jamais un `<input type="file">`
 * pouvant piocher dans la galerie (cf. `SelfieCaptureModal`, son premier
 * appelant). Logique extraite ici pour être réutilisée telle quelle par
 * l'étape dédiée de l'onboarding (`OnboardingSelfieStep`), qui capture le
 * selfie plus tôt dans le parcours plutôt qu'à la toute fin.
 */
export function useSelfieCapture({ userId, active, onCameraDenied }: UseSelfieCaptureOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<SelfieCaptureStatus>("requesting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const clearCapture = () => {
    setCapturedBlob(null);
    setCapturedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const fail = (message: string) => {
    setStatus("error");
    setErrorMessage(message);
    onCameraDenied?.();
  };

  const startCamera = async () => {
    setStatus("requesting");
    setErrorMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      // Cas des navigateurs in-app qui n'exposent jamais l'API caméra —
      // "réessaie" ne suffit pas ici, il faut changer de navigateur.
      fail("La caméra n'est pas accessible depuis ce navigateur. Ouvre Agapeo dans Chrome, Safari ou un autre navigateur plutôt que depuis Instagram, Facebook ou TikTok, puis réessaie.");
      return;
    }

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      fail("La caméra met trop de temps à répondre. Vérifie l'autorisation demandée par ton navigateur, puis réessaie.");
    }, CAMERA_TIMEOUT_MS);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (settled) {
        // Le délai a déjà été signalé à la personne — ce flux arrive trop
        // tard, on le referme aussitôt plutôt que de laisser la caméra
        // allumée pour rien derrière un écran d'erreur.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      clearTimeout(timeoutId);
      streamRef.current = stream;
      try {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("live");
      } catch {
        // `play()` peut être rejeté (fréquent sur iOS Safari) — sans ce
        // stopStream, la piste caméra restait active malgré l'état "error",
        // et la tentative suivante échouait avec NotReadableError ("déjà
        // utilisée") à cause de CE flux-là, jamais relâché.
        stopStream();
        fail("Impossible de démarrer l'aperçu de la caméra. Réessaie.");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (settled) return;
      settled = true;
      fail(classifyCameraError(err));
    }
  };

  useEffect(() => {
    if (!active) {
      stopStream();
      clearCapture();
      setStatus("requesting");
      return;
    }
    startCamera();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Miroir : reproduit ce que la personne voyait dans l'aperçu, pas l'image brute de la caméra.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          // La caméra elle-même fonctionne très bien ici (contrairement aux
          // échecs gérés par `fail`) — seule cette capture a raté (ex: canvas
          // pas encore dimensionné). On laisse le flux tourner et le bouton
          // "Prendre le selfie" en place plutôt que de forcer un redémarrage
          // complet de la caméra pour un simple raté ponctuel.
          setErrorMessage("La capture a échoué. Réessaie.");
          return;
        }
        setErrorMessage(null);
        setCapturedBlob(blob);
        setCapturedPreviewUrl(URL.createObjectURL(blob));
        setStatus("captured");
        stopStream();
      },
      "image/jpeg",
      0.9
    );
  };

  const handleRetake = () => {
    clearCapture();
    startCamera();
  };

  const confirm = async (): Promise<{ path: string } | { error: string }> => {
    if (!capturedBlob) return { error: "Aucun selfie capturé." };
    setStatus("uploading");
    setErrorMessage(null);
    try {
      const { path } = await uploadVerificationSelfie(userId, capturedBlob);
      return { path };
    } catch (err) {
      setStatus("captured");
      const message = err instanceof Error ? err.message : "L'envoi du selfie a échoué. Réessaie.";
      setErrorMessage(message);
      return { error: message };
    }
  };

  return {
    videoRef,
    canvasRef,
    status,
    errorMessage,
    capturedPreviewUrl,
    startCamera,
    handleCapture,
    handleRetake,
    confirm
  };
}
