import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

// Nommé `proxy` (et non `middleware`) depuis Next.js 16 — même fonctionnement,
// voir node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // `api` exclu : les routes API (ex. le webhook Chariow) gèrent leur propre
  // authentification (signature HMAC, pas de session utilisateur) — sans
  // cette exclusion, une requête serveur-à-serveur sans cookie de session
  // était silencieusement redirigée vers /login (200 HTML) au lieu d'atteindre
  // la route, jamais détecté avant un test réel avec une vraie signature.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
