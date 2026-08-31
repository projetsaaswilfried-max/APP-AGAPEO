"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { loadYouTubeIframeApi, type YouTubePlayerInstance } from "@/lib/youtube-iframe-api";
import { cn } from "@/lib/utils";

interface YouTubePlayerProps {
  videoId: string;
  className?: string;
}

/** Le script de l'API JS et le domaine youtube-nocookie.com du lecteur sont parfois lents/bloqués sur certains réseaux mobiles — passé ce délai, on bascule sur une intégration classique qui ne dépend d'aucun des deux. */
const API_LOAD_TIMEOUT_MS = 8000;

/**
 * Lecteur YouTube intégré (pas de rehébergement du fichier) avec le bouton
 * play, la timeline et le plein écran NATIFS de YouTube de bout en bout —
 * plus de vignette ni de bouton play maison par-dessus : c'est la propre
 * miniature/bouton play de YouTube qui s'affiche tant que la lecture n'a pas
 * commencé (`autoplay` volontairement absent).
 *
 * Seule chose qu'on continue de maîtriser : une fois la vidéo terminée, un
 * écran maison ("Revoir la vidéo") recouvre le lecteur pour empêcher l'écran
 * de fin natif de YouTube (suggestions d'autres vidéos) de s'afficher.
 *
 * Bug remonté par un membre : le lecteur restait un rectangle noir
 * indéfiniment sur son compte. Cause réelle — ni le script de l'API JS
 * YouTube, ni le domaine youtube-nocookie.com du lecteur lui-même, n'avaient
 * de filet de secours si l'un des deux était lent ou bloqué (pare-feu
 * d'opérateur mobile, etc.) : le conteneur restait vide pour toujours, sans
 * jamais rien afficher. On affiche désormais la vraie miniature YouTube en
 * arrière-plan dès le premier rendu, et on bascule sur une intégration
 * classique (<iframe> youtube.com, sans l'API JS ni le domaine nocookie) si
 * le lecteur n'a pas démarré après quelques secondes.
 */
export function YouTubePlayer({ videoId, className }: YouTubePlayerProps) {
  const elementId = `yt-player-${useId().replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);

  const [hasEnded, setHasEnded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [useFallbackEmbed, setUseFallbackEmbed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) setUseFallbackEmbed(true);
    }, API_LOAD_TIMEOUT_MS);

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      clearTimeout(timeoutId);
      playerRef.current = new YT.Player(elementId, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          controls: 1,
          fs: 1,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1
        },
        events: {
          onReady: () => setIsReady(true),
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.ENDED) {
              setHasEnded(true);
            } else if (event.data === YT.PlayerState.PLAYING) {
              setHasEnded(false);
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [elementId, videoId]);

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

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div
      className={cn("relative w-full aspect-video bg-black bg-cover bg-center", className)}
      style={!isReady ? { backgroundImage: `url(${thumbnailUrl})` } : undefined}
    >
      {useFallbackEmbed ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Vidéo YouTube"
        />
      ) : (
        <div id={elementId} ref={containerRef} className="absolute inset-0 w-full h-full" />
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
