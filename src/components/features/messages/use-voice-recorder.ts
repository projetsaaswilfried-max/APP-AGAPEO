import { useEffect, useRef, useState } from "react";

export type VoiceRecorderStatus = "idle" | "recording" | "recorded" | "error";

/** Garde-fou UX (pas une vraie limite technique) — le bucket `message-attachments` plafonne à 25 Mo. */
const MAX_DURATION_SECONDS = 300;

/**
 * Chrome/Firefox enregistrent en WebM/Opus par défaut, Safari (desktop et
 * iOS) uniquement en MP4/AAC — un mimeType figé en dur pour un seul
 * navigateur produit un blob invalide ou muet sur les autres. On détecte
 * toujours le format réellement supporté avant de démarrer.
 */
const CANDIDATE_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg;codecs=opus"];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Enregistrement vocal navigateur. Le blob final est toujours construit avec
 * le MÊME mimeType que celui utilisé par MediaRecorder (jamais deviné/codé en
 * dur) — un mimeType incorrect à l'upload est la cause n°1 d'un enregistrement
 * qui semble fonctionner mais reste muet à la lecture.
 */
export function useVoiceRecorder() {
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDurationSeconds, setRecordedDurationSeconds] = useState(0);
  /** Niveau du signal micro en direct (0..1) — sert de VU-mètre pendant l'enregistrement et de diagnostic : s'il reste à 0, le son ne parvient pas du tout au navigateur (problème de périphérique/pilote), indépendamment de tout ce qui se passe ensuite (encodage, lecture). */
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasDetectedSound, setHasDetectedSound] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef("audio/webm");
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterRafRef = useRef<number | null>(null);

  const stopStream = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (meterRafRef.current) {
      cancelAnimationFrame(meterRafRef.current);
      meterRafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  /** VU-mètre indépendant de MediaRecorder — lit le flux brut du micro pour prouver (ou infirmer) qu'un signal y arrive vraiment, avant tout encodage. */
  const startLevelMeter = (stream: MediaStream) => {
    try {
      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      audioContextRef.current = audioContext;

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sumSquares += v * v;
        }
        const level = Math.min(1, Math.sqrt(sumSquares / buffer.length) * 5);
        setAudioLevel(level);
        if (level > 0.04) setHasDetectedSound(true);
        meterRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Web Audio indisponible : le VU-mètre restera à 0, l'enregistrement continue normalement sans lui.
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setRecordedBlob(null);
    setHasDetectedSound(false);
    try {
      const mimeType = pickSupportedMimeType();
      if (!mimeType) throw new Error("L'enregistrement audio n'est pas supporté par ce navigateur.");

      // `echoCancellation`/`noiseSuppression` sont pensés pour un appel en
      // duplex (retirer ce que les haut-parleurs renvoient vers le micro) —
      // sur un simple enregistrement il n'y a rien à annuler, et ce
      // traitement peut alors mal interpréter la voix comme du bruit à
      // supprimer, laissant un résidu "vent"/souffle à la place de la voix.
      // On demande donc une capture brute ; `autoGainControl` reste utile
      // (ajuste juste le volume, ne dénature pas le signal).
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true, channelCount: 1 }
      });
      streamRef.current = stream;
      mimeTypeRef.current = mimeType;
      chunksRef.current = [];
      startLevelMeter(stream);

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        stopStream();
        if (blob.size > 0) {
          setRecordedBlob(blob);
          setRecordedDurationSeconds(durationSeconds);
          setStatus("recorded");
        } else {
          setStatus("idle");
        }
      };

      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      recorder.start();
      setStatus("recording");

      timerRef.current = setInterval(() => {
        const seconds = Math.round((Date.now() - startedAtRef.current) / 1000);
        setElapsedSeconds(seconds);
        if (seconds >= MAX_DURATION_SECONDS && mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 250);
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Autorise l'accès au micro pour envoyer une note vocale."
          : "Impossible de démarrer l'enregistrement audio."
      );
      stopStream();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder) recorder.onstop = null;
    if (recorder?.state === "recording") recorder.stop();
    stopStream();
    setStatus("idle");
    setElapsedSeconds(0);
    setRecordedBlob(null);
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setRecordedDurationSeconds(0);
    setStatus("idle");
    setElapsedSeconds(0);
  };

  useEffect(() => stopStream, []);

  return {
    status,
    elapsedSeconds,
    errorMessage,
    recordedBlob,
    recordedDurationSeconds,
    audioLevel,
    hasDetectedSound,
    startRecording,
    stopRecording,
    cancelRecording,
    discardRecording
  };
}
