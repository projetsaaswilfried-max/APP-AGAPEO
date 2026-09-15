import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/config/env";

const PUBLIC_ROUTES = [
  "/",
  "/bienvenue",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
  "/cgv",
  "/politique-de-confidentialite",
  "/mentions-legales",
  // Exigée par Google Play pour toute appli sociale/rencontre — doit rester
  // accessible publiquement sans connexion (renseignée dans la Play Console).
  "/normes-securite-enfants",
  // Fichiers de convention Next.js (robots.txt, sitemap.xml, images de
  // partage) : sans cette exclusion, Googlebot et les crawlers de reseaux
  // sociaux (WhatsApp, etc.), qui n'ont pas de cookie de session, etaient
  // silencieusement redirigés vers /login au lieu de recevoir le contenu.
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/twitter-image",
  "/manifest.webmanifest",
  // Verification Digital Asset Links du futur TWA Android (fichier a venir
  // dans public/.well-known/assetlinks.json) et equivalent iOS eventuel.
  "/.well-known",
  // Service worker (notifications push) : un navigateur refuse d'enregistrer
  // un service worker si la reponse est une redirection — doit rester public.
  "/sw.js",
  // Page hors-ligne mise en cache par le service worker (cf. public/sw.js) :
  // si elle redirigeait vers /login pour un visiteur non connecté, le
  // service worker mettrait en cache la page de connexion à la place, et la
  // servirait ensuite à tort en cas de coupure réseau.
  "/offline.html"
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

// Porte d'entrée de l'espace équipe — délibérément PAS dans PUBLIC_ROUTES
// (dont le matching par préfixe rendrait aussi "/ayekoutche/overview" etc.
// public, contournant toute vérification de session). Seule la page de
// connexion elle-même (`/ayekoutche` exact) doit rester joignable sans
// session ; ses sous-pages restent protégées comme l'était `/admin/*` avant
// elle, avec un renvoi vers CETTE connexion plutôt que vers `/login`.
const ADMIN_LOGIN_ROUTE = "/ayekoutche";

/**
 * Rafraîchit la session Supabase sur chaque requête et applique les
 * redirections "optimistes" (lecture du cookie de session uniquement — pas
 * de requête base de données ici, cf. doc Next.js sur l'authentification :
 * les vérifications lentes/métier vivent dans les layouts serveur).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicRoute = isPublicRoute(pathname);

  if (pathname === ADMIN_LOGIN_ROUTE) {
    return response;
  }

  if (pathname.startsWith(`${ADMIN_LOGIN_ROUTE}/`) && !user) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN_ROUTE, request.url));
  }

  if (!user && !publicRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/" || pathname === "/bienvenue" || pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  return response;
}
