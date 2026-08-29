"use client";

import React, { useEffect, useRef, useState } from "react";
import { PlayIcon, PauseIcon, AlertCircleIcon, Mic01Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Un seul lecteur de note vocale actif à la fois sur toute la page — démarrer
 * la lecture d'une note met en pause toutes les autres déjà en cours. Partagé
 * au niveau module (pas de contexte React) : aucune coordination d'état n'est
 * nécessaire entre bulles, l'événement natif `pause` de chaque élément
 * `<audio>` mis en pause par un autre suffit à resynchroniser son icône.
 */
const activeAudioElements = new Set<HTMLAudioElement>();

const WAVEFORM_BARS = 32;

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function describeMediaError(audio: HTMLAudioElement): string {
  switch (audio.error?.code) {
    case MediaError.MEDIA_ERR_NETWORK:
      return "Erreur réseau pendant le chargement.";
    case MediaError.MEDIA_ERR_DECODE:
      return "Fichier audio corrompu ou illisible.";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "Format audio non supporté par ce navigateur.";
    default:
      return "Lecture impossible.";
  }
}

/** Motif de secours déterministe (seedé par l'URL, jamais aléatoire à chaque rendu) si l'extraction réelle du son échoue (décodage impossible, réseau...). */
function fallbackPeaks(seed: string): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const peaks: number[] = [];
  for (let i = 0; i < WAVEFORM_BARS; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    peaks.push(0.25 + ((hash >>> 8) % 1000) / 1000 / 1.55);
  }
  return peaks;
}

/** Décode réellement le fichier pour en tirer les crêtes d'amplitude — un vrai motif audio, pas une décoration. */
async function extractPeaks(url: string): Promise<number[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextCtor();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.max(1, Math.floor(channelData.length / WAVEFORM_BARS));
    const rawPeaks: number[] = [];
    for (let i = 0; i < WAVEFORM_BARS; i++) {
      let max = 0;
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, channelData.length);
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      rawPeaks.push(max);
    }
    const maxPeak = Math.max(...rawPeaks, 0.05);
    return rawPeaks.map((p) => Math.max(0.12, p / maxPeak));
  } finally {
    audioContext.close().catch(() => {});
  }
}

interface VoiceMessagePlayerProps {
  url: string;
  durationSeconds?: number;
  mimeType?: string;
  isCurrentUser: boolean;
  avatarUrl?: string;
  avatarFallback?: string;
}

export function VoiceMessagePlayer({ url, durationSeconds, mimeType, isCurrentUser, avatarUrl, avatarFallback }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    extractPeaks(url)
      .then((p) => {
        if (!cancelled) setPeaks(p);
      })
      .catch(() => {
        if (!cancelled) setPeaks(fallbackPeaks(url));
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setIsPlaying(false);
      setError(describeMediaError(audio));
      console.error("Note vocale illisible :", audio.error, { url, mimeType });
    };
    // Se déclenche aussi bien pour une pause déclenchée par l'utilisateur ICI
    // que pour une pause imposée par un AUTRE lecteur qui vient de démarrer —
    // dans les deux cas l'icône doit repasser sur "lecture".
    const onPause = () => setIsPlaying(false);
    // Dès que CE lecteur démarre, on coupe tous les autres déjà actifs.
    const onPlay = () => {
      activeAudioElements.forEach((other) => {
        if (other !== audio && !other.paused) other.pause();
      });
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    activeAudioElements.add(audio);
    // Force la ré-évaluation des <source> enfants — sans ça, un changement de
    // `url` (ré-signature) n'est pas repris tant que `.load()` n'a pas été
    // rappelé explicitement.
    audio.load();
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      activeAudioElements.delete(audio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      return;
    }
    setError(null);
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        setIsPlaying(false);
        setError(describeMediaError(audio));
        console.error("Lecture de la note vocale impossible :", err, { url, mimeType });
      });
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const container = waveformRef.current;
    if (!audio || !container || duration <= 0) return;
    const rect = container.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const target = fraction * duration;
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const displayPeaks = peaks ?? fallbackPeaks(url);

  return (
    <div className="flex flex-col gap-1 w-full min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <audio ref={audioRef} preload="metadata" className="hidden">
          {/* `<source type>` porte le codec complet (ex. codecs=opus) — le
              Content-Type HTTP servi par Supabase Storage le tronque parfois
              en un simple "audio/webm", ce qui peut suffire à faire échouer
              la sélection de source sur certains navigateurs sans ce filet. */}
          {mimeType && <source src={url} type={mimeType} />}
          <source src={url} />
        </audio>

        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            "shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
            isCurrentUser ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
          )}
          title={isPlaying ? "Mettre en pause" : "Écouter"}
        >
          <HugeIcon icon={isPlaying ? PauseIcon : PlayIcon} size={13} />
        </button>

        {/* `min-w-0` + barres en `flex-1` (pas de largeur fixe en px) : le
            nombre de barres reste constant, seule leur largeur individuelle
            s'adapte à l'espace réellement disponible — jamais de débordement
            sur un écran étroit, contrairement à une largeur figée. */}
        <div
          ref={waveformRef}
          onClick={handleWaveformClick}
          className="relative flex-1 min-w-0 h-6 flex items-center gap-[2px] cursor-pointer"
        >
          {displayPeaks.map((peak, i) => {
            const played = displayPeaks.length > 1 ? i / (displayPeaks.length - 1) <= progress : progress >= 1;
            return (
              <span
                key={i}
                className={cn(
                  "flex-1 min-w-[1.5px] rounded-full transition-colors",
                  isCurrentUser ? (played ? "bg-primary-foreground" : "bg-primary-foreground/35") : played ? "bg-primary" : "bg-primary/25"
                )}
                style={{ height: `${12 + peak * 88}%` }}
              />
            );
          })}
          <span
            className="absolute w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-white/50 shadow-sm pointer-events-none"
            style={{ left: `${Math.min(100, progress * 100)}%`, transform: "translateX(-50%)" }}
          />
        </div>

        <div className="relative shrink-0">
          <Avatar src={avatarUrl} fallback={avatarFallback} size="sm" />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-foreground text-background ring-2",
              isCurrentUser ? "ring-primary" : "ring-card"
            )}
          >
            <HugeIcon icon={Mic01Icon} size={9} color="currentColor" />
          </span>
        </div>
      </div>

      <div
        className={cn(
          "pl-10 text-[10px] font-mono tabular-nums",
          isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground/80"
        )}
      >
        {formatDuration(currentTime > 0 ? currentTime : duration)}
      </div>

      {error && (
        <div className={cn("flex items-center gap-1 text-[10px] pl-10", isCurrentUser ? "text-primary-foreground/90" : "text-destructive")}>
          <HugeIcon icon={AlertCircleIcon} size={11} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
