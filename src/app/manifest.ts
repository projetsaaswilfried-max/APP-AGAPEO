import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

// Rend le site installable (PWA) — prerequis obligatoire pour generer le
// TWA (Trusted Web Activity) avec Bubblewrap en vue du Play Store.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_CONFIG.fullName,
    short_name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    start_url: "/",
    display: "standalone",
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
