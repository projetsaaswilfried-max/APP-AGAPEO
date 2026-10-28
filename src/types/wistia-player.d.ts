import type { DetailedHTMLProps, HTMLAttributes } from "react";

/**
 * Élément personnalisé <wistia-player> (défini par https://fast.wistia.com/player.js),
 * utilisé par la vidéo de la landing (src/components/home/components/HeroVideo.tsx).
 * Seuls les attributs réellement employés sont déclarés.
 */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "wistia-player": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        "media-id": string;
        aspect?: string;
        "player-color"?: string;
      };
    }
  }
}
