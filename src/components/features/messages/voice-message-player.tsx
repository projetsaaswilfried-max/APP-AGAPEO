"use client";

import React, { useEffect, useRef, useState } from "react";
import { PlayIcon, PauseIcon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { cn } from "@/lib/utils";

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

interface VoiceMessagePlayerProps {
  url: string;
  durationSeconds?: number;
  mimeType?: string;
  isCurrentUser: boolean;
}

export function VoiceMessagePlayer({ url, durationSeconds, mimeType, isCurrentUser }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [error, setError] = useState<string | null>(null);

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
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    // Force la ré-évaluation des <source> enfants — sans ça, un changement
    // de `url` (ré-signature) n'est pas repris tant que `.load()` n'a pas
    // été rappelé explicitement.
    audio.load();
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const value = Number(e.target.value);
    setCurrentTime(value);
    if (audio) audio.currentTime = value;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1 min-w-[12rem]">
      <div className="flex items-center gap-2.5 py-0.5">
        {/* `<source type>` porte le codec complet (ex. codecs=opus) — le
            Content-Type HTTP servi par Supabase Storage le tronque parfois
            en un simple "audio/webm", ce qui peut suffire à faire échouer
            la sélection de source sur certains navigateurs sans ce filet. */}
        <audio ref={audioRef} preload="metadata" className="hidden">
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
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className={cn(
            "voice-seek flex-1 h-1 rounded-full appearance-none cursor-pointer",
            isCurrentUser ? "bg-primary-foreground/30 text-primary-foreground" : "bg-primary/20 text-primary"
          )}
          style={{ backgroundImage: `linear-gradient(to right, currentColor ${progress}%, transparent ${progress}%)` }}
        />
        <span className="shrink-0 text-[10px] font-mono tabular-nums opacity-80">{formatDuration(currentTime > 0 ? currentTime : duration)}</span>
      </div>
      {error && (
        <div className={cn("flex items-center gap-1 text-[10px]", isCurrentUser ? "text-primary-foreground/90" : "text-destructive")}>
          <HugeIcon icon={AlertCircleIcon} size={11} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
