"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw } from "lucide-react";
import { loadYouTubeIframeApi, type YouTubePlayerInstance } from "@/lib/youtube-iframe-api";
import { cn } from "@/lib/utils";

interface YouTubePlayerProps {
  videoId: string;
  thumbnailUrl?: string;
  className?: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Lecteur YouTube intégré (pas de rehébergement du fichier), avec des
 * contrôles maison plutôt que ceux natifs de YouTube : impossible d'avancer
 * la vidéo (pas de barre de progression cliquable, clavier désactivé), et
 * aucun bouton natif ne peut renvoyer vers YouTube (menu "...", logo,
 * suggestions) puisque leur barre de contrôle est entièrement masquée
 * (`controls: 0`). Une fois la vidéo terminée, un écran maison recouvre le
 * lecteur pour la même raison.
 */
export function YouTubePlayer({ videoId, thumbnailUrl, className }: YouTubePlayerProps) {
  const elementId = `yt-player-${useId().replace(/:/g, "")}`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isPlaying || playerRef.current) return;

    let cancelled = false;
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new YT.Player(elementId, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1
        },
        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration());
            setIsMuted(event.target.isMuted());
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.ENDED) {
              setHasEnded(true);
              setIsPaused(false);
            } else if (event.data === YT.PlayerState.PLAYING) {
              setHasEnded(false);
              setIsPaused(false);
              setDuration(event.target.getDuration());
            } else if (event.data === YT.PlayerState.PAUSED) {
              setIsPaused(true);
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isPlaying, elementId, videoId]);

  // Progression visuelle uniquement — aucun handler de clic/drag dessus.
  useEffect(() => {
    if (!isPlaying) return;
    progressTimerRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setCurrentTime(player.getCurrentTime());
    }, 250);
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
    };
  }, []);

  const handleReplay = () => {
    setHasEnded(false);
    playerRef.current?.seekTo(0, true);
    playerRef.current?.playVideo();
  };

  const handleTogglePlayPause = () => {
    const player = playerRef.current;
    if (!player) return;
    if (isPaused) {
      player.playVideo();
    } else {
      player.pauseVideo();
      setIsPaused(true);
    }
  };

  const handleToggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    if (isMuted) {
      player.unMute();
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  const handleToggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapperRef.current?.requestFullscreen();
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div ref={wrapperRef} className={cn("relative w-full aspect-video bg-black", className)}>
      {isPlaying ? (
        <div id={elementId} ref={containerRef} className="absolute inset-0 w-full h-full" />
      ) : (
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 w-full h-full group"
          aria-label="Lire la vidéo"
        >
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 shadow-lg group-hover:scale-105 transition-transform">
              <Play size={26} className="text-black fill-current ml-1" />
            </div>
          </div>
        </button>
      )}

      {/* Recouvre l'iframe en pause : YouTube affiche son propre titre/nom de
          chaîne par-dessus la vidéo dès qu'elle est en pause, même avec
          controls: 0 — impossible à désactiver côté YouTube, donc on cache
          l'iframe entièrement plutôt que de le laisser transparaître. */}
      {isPlaying && isPaused && !hasEnded && (
        <button
          type="button"
          onClick={handleTogglePlayPause}
          aria-label="Lecture"
          className="absolute inset-0 z-10 bg-black flex items-center justify-center"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/90 hover:bg-white transition-colors">
            <Play size={22} className="text-black fill-current ml-0.5" />
          </div>
        </button>
      )}

      {isPlaying && !hasEnded && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-2 pt-6 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-1.5">
          {/* Barre de progression purement visuelle — aucun pointer-events, impossible de cliquer ou glisser pour avancer. */}
          <div className="h-1 w-full rounded-full bg-white/25 pointer-events-none overflow-hidden">
            <div className="h-full bg-white rounded-full transition-[width] duration-200" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePlayPause}
                aria-label={isPaused ? "Lecture" : "Pause"}
                className="flex items-center justify-center w-7 h-7 rounded-full text-white hover:bg-white/15 transition-colors"
              >
                {isPaused ? <Play size={15} className="fill-current" /> : <Pause size={15} className="fill-current" />}
              </button>
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? "Activer le son" : "Couper le son"}
                className="flex items-center justify-center w-7 h-7 rounded-full text-white hover:bg-white/15 transition-colors"
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <span className="text-[11px] font-medium text-white/90 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleFullscreen}
              aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
              className="flex items-center justify-center w-7 h-7 rounded-full text-white hover:bg-white/15 transition-colors"
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          </div>
        </div>
      )}

      {hasEnded && (
        <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleReplay}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 text-black text-sm font-semibold hover:bg-white transition-colors"
          >
            <RotateCcw size={16} /> Revoir la vidéo
          </button>
        </div>
      )}
    </div>
  );
}
