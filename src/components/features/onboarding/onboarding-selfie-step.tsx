"use client";

import { useState } from "react";
import { Camera, RotateCcw, Send, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingStepFooter } from "./onboarding-step-footer";
import { useSelfieCapture } from "@/components/features/account/use-selfie-capture";
import { savePendingSelfieAction } from "@/lib/actions/profile.actions";
import { logOnboardingEventAction } from "@/lib/actions/onboarding-events.actions";

interface OnboardingSelfieStepProps {
  userId: string;
  hasPendingSelfie: boolean;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Capture le selfie de vérification tôt dans l'onboarding (juste après les
 * photos) plutôt qu'à la toute fin de l'assistant, après le champ "pourquoi
 * le mariage" — évite d'empiler les deux étapes les plus exigeantes au
 * moment où la motivation est la plus fragile. Le chemin est stocké côté
 * profil (`pending_selfie_storage_path`) et consommé plus tard par
 * `submitVerificationRequestAction`, à la fin de l'étape "Préférences".
 */
export function OnboardingSelfieStep({ userId, hasPendingSelfie, onNext, onBack }: OnboardingSelfieStepProps) {
  const [alreadyCaptured, setAlreadyCaptured] = useState(hasPendingSelfie);
  const [isRetaking, setIsRetaking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const active = !alreadyCaptured || isRetaking;

  const { videoRef, canvasRef, status, errorMessage, capturedPreviewUrl, startCamera, handleCapture, handleRetake, confirm } = useSelfieCapture({
    userId,
    active,
    onCameraDenied: () => {
      void logOnboardingEventAction("SELFIE_CAMERA_DENIED", "selfie");
    }
  });

  const handleConfirm = async () => {
    const result = await confirm();
    if (!("path" in result)) return;
    setIsSaving(true);
    await savePendingSelfieAction(result.path);
    void logOnboardingEventAction("SELFIE_CAPTURED", "selfie");
    setIsSaving(false);
    setAlreadyCaptured(true);
    setIsRetaking(false);
  };

  const handleRetakeClick = () => {
    setIsRetaking(true);
    setAlreadyCaptured(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Confirme que c&apos;est bien toi</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Un selfie en direct, comparé à tes photos par notre équipe — c&apos;est ce qui protège tout le monde des faux
          profils sur Agapeo. Il n&apos;est jamais visible par les autres membres, uniquement par notre équipe de
          modération.
        </p>
      </div>

      {alreadyCaptured && !isRetaking ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Selfie enregistré</p>
            <p className="text-xs text-muted-foreground">Tu pourras le reprendre à tout moment avant la soumission finale.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRetakeClick} leftIcon={<RotateCcw size={13} />}>
            Reprendre
          </Button>
        </div>
      ) : (
        <>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetake}
                  disabled={status === "uploading" || isSaving}
                  leftIcon={<RotateCcw size={14} />}
                >
                  Reprendre
                </Button>
                <Button variant="primary" size="sm" onClick={handleConfirm} isLoading={status === "uploading" || isSaving} leftIcon={<Send size={14} />}>
                  Valider ce selfie
                </Button>
              </>
            )}
          </div>
        </>
      )}

      <OnboardingStepFooter onSaveAndNext={onNext} onBack={onBack} isNextDisabled={!alreadyCaptured || isRetaking} />
    </div>
  );
}
