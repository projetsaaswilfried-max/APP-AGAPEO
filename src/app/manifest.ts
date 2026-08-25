import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

// Rend le site installable (PWA) — prerequis obligatoire pour generer le
// TWA (Trusted Web Activity) avec Bubblewrap en vue du Play Store.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_CONFIG.fullName,
    short_name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    // Identifiant stable de l'appli installée — indépendant de `start_url`
    // (qui, lui, peut changer un jour) pour qu'Android/le navigateur ne la
    // traitent jamais comme une appli différente après un tel changement.
    id: "/",
    // Sépare volontairement l'entrée de l'appli installée (TWA Android /
    // "Ajouter à l'écran d'accueil") de la page d'accueil marketing du site
    // (toujours "/" pour un visiteur web classique) — cf. src/app/bienvenue.
    start_url: "/bienvenue",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#FE70B2",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
