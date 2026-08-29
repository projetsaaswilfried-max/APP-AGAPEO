import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Trouvé en audit sécurité : aucun en-tête de sécurité n'était défini.
  // Volontairement pas de Content-Security-Policy ici — le site charge Meta
  // Pixel, Google Fonts, des vidéos YouTube et des images Supabase Storage ;
  // une CSP mal calibrée casserait ces intégrations sans pouvoir être
  // vérifiée visuellement page par page depuis cet environnement. Les
  // en-têtes ci-dessous sont sans risque de régression et protègent contre
  // le clickjacking et le MIME-sniffing, et limitent les permissions
  // navigateur à ce que l'app utilise réellement (caméra pour le selfie de
  // vérification, micro pour les notes vocales dans la messagerie, rien
  // d'autre). `microphone=()` bloquait le micro pour TOUTE origine, y compris
  // la nôtre : le navigateur rejetait alors getUserMedia immédiatement, sans
  // jamais afficher sa pop-up native d'autorisation — d'où l'impression que
  // "rien ne se passait" au clic sur le bouton micro.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" }
        ]
      }
    ];
  }
};

export default nextConfig;
