"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Send, AlertCircle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { uploadVerificationSelfie } from "@/lib/storage";

interface SelfieCaptureModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  /** Appelé une fois le selfie envoyé avec succès, avec le chemin de stockage à transmettre à submitVerificationRequestAction. */
  onCaptured: (selfieStoragePath: string) => void;
}

type CaptureStatus = "requesting" | "live" | "captured" | "uploading" | "error";

/**
 * Capture caméra en direct uniquement — jamais un `<input type="file">`
 * pouvant piocher dans la galerie. C'est tout l'intérêt de la vérification
 * par selfie : prouver qu'une vraie personne se trouve devant l'appareil au
 * moment de la demande, pas seulement qu'elle sait importer une image de
 * plus (cf. le problème initial : quelqu'un postant les photos d'une autre
 * personne comme "ses" photos de profil).
 */
export function SelfieCaptureModal({ isOpen, userId, onClose, onCaptured }: SelfieCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CaptureStatus>("requesting");
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
      setErrorMessage(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Autorise l'accès à la caméra dans les réglages de ton navigateur pour continuer."
          : "Impossible d'accéder à la caméra. Vérifie qu'aucune autre application ne l'utilise, puis réessaie."
      );
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      clearCapture();
      setStatus("requesting");
      return;
    }
    startCamera();
    return () => stopStream();
  }, [isOpen]);

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

  const handleConfirm = async () => {
    if (!capturedBlob) return;
    setStatus("uploading");
    setErrorMessage(null);
    try {
      const { path } = await uploadVerificationSelfie(userId, capturedBlob);
      onCaptured(path);
    } catch (err) {
      setStatus("captured");
      setErrorMessage(err instanceof Error ? err.message : "L'envoi du selfie a échoué. Réessaie.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vérifie ton identité"
      description="Prends un selfie en direct — notre équipe le compare à tes photos de profil avant de valider."
    >
      <div className="space-y-4">
        <div className="relative aspect-square w-full max-w-xs mx-auto rounded-2xl overflow-hidden bg-secondary">
          {(status === "live" || status === "requesting") && (
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover -scale-x-100" />
          )}
          {(status === "captured" || status === "uploading") && capturedPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedPreviewUrl} alt="Ton selfie" className="w-full h-full object-cover" />
          )}
          {status === "requesting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            <AlertCircle size={15} className="shrink-0" />
            {errorMessage}
          </div>
        )}

        <div className="flex justify-center gap-3">
          {status === "live" && (
            <Button variant="primary" size="sm" onClick={handleCapture} leftIcon={<Camera size={15} />}>
              Prendre le selfie
            </Button>
          )}
          {status === "error" && (
            <Button variant="outline" size="sm" onClick={startCamera}>
              Réessayer
            </Button>
          )}
          {(status === "captured" || status === "uploading") && (
            <>
              <Button variant="ghost" size="sm" onClick={handleRetake} disabled={status === "uploading"} leftIcon={<RotateCcw size={14} />}>
                Reprendre
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirm} isLoading={status === "uploading"} leftIcon={<Send size={14} />}>
                Envoyer
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
