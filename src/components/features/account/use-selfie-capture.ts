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

  const startCamera = async () => {
    setStatus("requesting");
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("live");
    } catch (err) {
      setStatus("error");
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setErrorMessage(
        denied
          ? "Autorise l'accès à la caméra dans les réglages de ton navigateur pour continuer."
          : "Impossible d'accéder à la caméra. Vérifie qu'aucune autre application ne l'utilise, puis réessaie."
      );
      onCameraDenied?.();
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
        if (!blob) return;
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
