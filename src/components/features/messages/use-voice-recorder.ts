import { useEffect, useRef, useState } from "react";

export type VoiceRecorderStatus = "idle" | "recording" | "recorded" | "error";

/** Garde-fou UX (pas une vraie limite technique) — le bucket `message-attachments` plafonne à 25 Mo. */
const MAX_DURATION_SECONDS = 300;

/** Nombre de barres affichées par le graphe façon WhatsApp pendant l'enregistrement. */
const WAVEFORM_BAR_COUNT = 40;
const WAVEFORM_SAMPLE_INTERVAL_MS = 120;

/**
 * Beaucoup de micros (surtout intégrés) enregistrent nettement plus bas que
 * la voix perçue à l'oreille — `autoGainControl` du navigateur ne suffit pas
 * toujours. On applique donc un compresseur (lisse les pics pour éviter la
 * saturation) puis un gain fixe, appliqués AU SIGNAL ENREGISTRÉ lui-même
 * (pas seulement à la lecture) pour que le fichier final soit plus fort
 * partout où il est ensuite écouté.
 */
const RECORDING_GAIN = 2.4;

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
  /** URL locale (objet Blob, jamais uploadée) permettant d'écouter le brouillon avant envoi — révoquée dès qu'elle n'est plus utile pour ne pas fuiter de mémoire. */
  const [recordedPreviewUrl, setRecordedPreviewUrlState] = useState<string | null>(null);
  const recordedPreviewUrlRef = useRef<string | null>(null);
  /** Niveau du signal micro en direct (0..1) — sert de VU-mètre pendant l'enregistrement et de diagnostic : s'il reste à 0, le son ne parvient pas du tout au navigateur (problème de périphérique/pilote), indépendamment de tout ce qui se passe ensuite (encodage, lecture). */
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasDetectedSound, setHasDetectedSound] = useState(false);
  /** Historique récent du niveau — alimente le graphe façon WhatsApp pendant l'enregistrement. */
  // Toujours exactement WAVEFORM_BAR_COUNT valeurs, dès le premier rendu —
  // un tableau qui grandit progressivement de 0 à 40 barres donnerait
  // l'impression que "la ligne progresse"/s'agrandit au fil de
  // l'enregistrement ; ici seule la HAUTEUR de chaque barre change, jamais
  // leur nombre, donc la géométrie reste fixe du premier au dernier instant.
  const [levelHistory, setLevelHistory] = useState<number[]>(() => new Array(WAVEFORM_BAR_COUNT).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef("audio/webm");
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterRafRef = useRef<number | null>(null);
  const currentLevelRef = useRef(0);

  /** Remplace l'URL de prévisualisation en révoquant systématiquement l'ancienne — jamais deux à la fois, jamais de fuite mémoire. */
  const setRecordedPreviewUrl = (url: string | null) => {
    if (recordedPreviewUrlRef.current) URL.revokeObjectURL(recordedPreviewUrlRef.current);
    recordedPreviewUrlRef.current = url;
    setRecordedPreviewUrlState(url);
  };

  const stopStream = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (waveformIntervalRef.current) {
      clearInterval(waveformIntervalRef.current);
      waveformIntervalRef.current = null;
    }
    if (meterRafRef.current) {
      cancelAnimationFrame(meterRafRef.current);
      meterRafRef.current = null;
    }
    rawStreamRef.current?.getTracks().forEach((track) => track.stop());
    rawStreamRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
    currentLevelRef.current = 0;
  };

  /**
   * Construit la chaîne micro → compresseur → gain, branchée à la fois vers
   * un `MediaStreamDestination` (ce que MediaRecorder enregistre réellement,
   * donc le boost est déjà dans le fichier envoyé) et vers un analyseur (VU-
   * mètre + graphe pendant l'enregistrement). Renvoie le flux à donner à
   * MediaRecorder, ou le flux brut si Web Audio est indisponible.
   */
  const buildProcessedStream = (rawStream: MediaStream): MediaStream => {
    try {
      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(rawStream);
      const compressor = audioContext.createDynamicsCompressor();
      const gain = audioContext.createGain();
      gain.gain.value = RECORDING_GAIN;
      const destination = audioContext.createMediaStreamDestination();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;

      source.connect(compressor);
      compressor.connect(gain);
      gain.connect(destination);
      gain.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sumSquares += v * v;
        }
        const level = Math.min(1, Math.sqrt(sumSquares / buffer.length) * 5);
        currentLevelRef.current = level;
        setAudioLevel(level);
        if (level > 0.04) setHasDetectedSound(true);
        meterRafRef.current = requestAnimationFrame(tick);
      };
      tick();

      waveformIntervalRef.current = setInterval(() => {
        setLevelHistory((prev) => [...prev.slice(1), currentLevelRef.current]);
      }, WAVEFORM_SAMPLE_INTERVAL_MS);

      return destination.stream;
    } catch {
      // Web Audio indisponible : on enregistre le flux brut sans boost ni VU-mètre plutôt que de bloquer la fonctionnalité.
      return rawStream;
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setRecordedBlob(null);
    setRecordedPreviewUrl(null);
    setHasDetectedSound(false);
    setLevelHistory(new Array(WAVEFORM_BAR_COUNT).fill(0));
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
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true, channelCount: 1 }
      });
      rawStreamRef.current = rawStream;
      mimeTypeRef.current = mimeType;
      chunksRef.current = [];

      const processedStream = buildProcessedStream(rawStream);

      const recorder = new MediaRecorder(processedStream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        stopStream();
        if (blob.size > 0) {
          setRecordedBlob(blob);
          setRecordedPreviewUrl(URL.createObjectURL(blob));
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
    setRecordedPreviewUrl(null);
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setRecordedPreviewUrl(null);
    setRecordedDurationSeconds(0);
    setStatus("idle");
    setElapsedSeconds(0);
  };

  useEffect(() => {
    return () => {
      stopStream();
      if (recordedPreviewUrlRef.current) URL.revokeObjectURL(recordedPreviewUrlRef.current);
    };
  }, []);

  return {
    status,
    elapsedSeconds,
    errorMessage,
    recordedBlob,
    recordedPreviewUrl,
    recordedDurationSeconds,
    audioLevel,
    hasDetectedSound,
    levelHistory,
    startRecording,
    stopRecording,
    cancelRecording,
    discardRecording
  };
}
