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
    // Tout le site reste "dans" l'appli installée (aucune section à part).
    scope: "/",
    lang: "fr",
    dir: "ltr",
    display: "standalone",
    display_override: ["standalone"],
    orientation: "portrait",
    categories: ["social", "lifestyle"],
    background_color: "#FFFFFF",
    theme_color: "#FE70B2",
    // Une fois l'appli disponible sur le Play Store, on privilégie sa
    // proposition d'installation à celle du PWA depuis le navigateur.
    related_applications: [
      { platform: "play", url: "https://play.google.com/store/apps/details?id=love.agapeo.app", id: "love.agapeo.app" }
    ],
    prefer_related_applications: true,
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
    ],
    // Visuels promotionnels (pas des captures brutes de l'interface) —
    // utilisés par le navigateur/l'OS pour l'aperçu d'installation enrichi,
    // et repris par PWABuilder pour la fiche Play Store.
    screenshots: [
      {
        src: "/screenshots/welcome.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Bienvenue sur Agapeo"
      },
      {
        src: "/screenshots/create-profile.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Crée ton profil"
      },
      {
        src: "/screenshots/messages.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Une messagerie riche pour des échanges sincères"
      },
      {
        src: "/screenshots/verified-matches.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Match avec des profils certifiés"
      }
    ]
  };
}
