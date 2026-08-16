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
 * contrôles maison plutôt que ceux natifs de YouTube : la barre de
 * progression permet d'avancer/reculer (clic ou glisser), mais aucun bouton
 * natif ne peut renvoyer vers YouTube (menu "...", logo, suggestions)
 * puisque leur barre de contrôle est entièrement masquée (`controls: 0`).
 * Une fois la vidéo terminée, un écran maison recouvre le lecteur pour la
 * même raison. En pause, YouTube affiche son propre titre/nom de chaîne
 * par-dessus la vidéo (impossible à désactiver côté YouTube) — accepté tel
 * quel, pas de recouvrement pour ce cas-là.
 */
export function YouTubePlayer({ videoId, thumbnailUrl, className }: YouTubePlayerProps) {
  const elementId = `yt-player-${useId().replace(/:/g, "")}`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState(0);

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

  const percentFromPointer = (clientX: number) => {
    const bar = progressBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  };

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragPercent(percentFromPointer(e.clientX));
  };

  const handleSeekPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragPercent(percentFromPointer(e.clientX));
  };

  const handleSeekPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    const percent = percentFromPointer(e.clientX);
    const seekTime = (percent / 100) * duration;
    playerRef.current?.seekTo(seekTime, true);
    setCurrentTime(seekTime);
  };

  const handleToggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapperRef.current?.requestFullscreen();
    }
  };

  const progressPercent = isDragging ? dragPercent : duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const displayTime = isDragging ? (dragPercent / 100) * duration : currentTime;

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

      {isPlaying && !hasEnded && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-2 pt-6 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-1.5">
          {/* Barre de progression interactive — clic ou glisser pour avancer/reculer. */}
          <div
            ref={progressBarRef}
            onPointerDown={handleSeekPointerDown}
            onPointerMove={handleSeekPointerMove}
            onPointerUp={handleSeekPointerUp}
            className="group/bar relative h-1 w-full rounded-full bg-white/25 overflow-visible cursor-pointer touch-none py-1.5 -my-1.5"
          >
            <div className="h-1 w-full rounded-full bg-white/25 overflow-hidden">
              <div
                className={cn("h-full bg-white rounded-full", !isDragging && "transition-[width] duration-200")}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div
              className="absolute top-1/2 w-3 h-3 rounded-full bg-white shadow -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100"
              style={{ left: `${progressPercent}%`, opacity: isDragging ? 1 : undefined }}
            />
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
                {formatTime(displayTime)} / {formatTime(duration)}
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
