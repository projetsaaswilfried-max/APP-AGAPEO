import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/cgv", "/mentions-legales", "/politique-de-confidentialite"],
        // Espace membre/admin, pages transactionnelles et routes techniques :
        // jamais indexées (contenu privé et/ou sans intérêt pour la recherche).
        disallow: [
          "/feed",
          "/messages",
          "/notifications",
          "/discover",
          "/profile",
          "/premium",
          "/support",
          "/charter",
          "/onboarding",
          "/admin",
          "/api",
          "/auth/callback",
          "/forgot-password",
          "/reset-password",
          "/suspended"
        ]
      }
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`
  };
}
