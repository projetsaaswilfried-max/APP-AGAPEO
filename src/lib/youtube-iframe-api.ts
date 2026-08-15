/**
 * Chargeur partagé de l'API IFrame YouTube — publique et gratuite, aucune
 * clé requise (à ne pas confondre avec la YouTube Data API, qui elle en
 * exige une). Un seul <script> est injecté même si plusieurs lecteurs sont
 * montés en même temps sur la page (plusieurs vidéos dans le fil).
 */

export interface YouTubePlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YouTubePlayerOptions {
  videoId: string;
  host?: string;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (event: { target: YouTubePlayerInstance }) => void;
    onStateChange?: (event: { data: number; target: YouTubePlayerInstance }) => void;
  };
}

interface YouTubeIframeApi {
  Player: new (elementId: string, options: YouTubePlayerOptions) => YouTubePlayerInstance;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
}

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loaderPromise: Promise<YouTubeIframeApi> | null = null;

export function loadYouTubeIframeApi(): Promise<YouTubeIframeApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT!);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return loaderPromise;
}
