import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePostAuthRedirect } from "@/lib/supabase/post-auth-redirect";

// Même garde-fou que /auth/confirm (cf. son commentaire dédié) : un code déjà
// consommé ou invalide ne doit jamais laisser la page attendre indéfiniment
// Supabase Auth, quelle que soit la lenteur constatée de leur côté.
const VERIFY_TIMEOUT_MS = 8000;

/**
 * Point d'arrivée de la connexion Google (OAuth) — seul flux qui produit
 * réellement un `?code=` PKCE exploitable côté serveur. Les liens envoyés
 * par email (confirmation, mot de passe, changement d'adresse) passent par
 * `/auth/confirm` (`token_hash` + `verifyOtp`) : le mécanisme historique
 * `{{ .ConfirmationURL }}` de Supabase Auth redirige avec les jetons dans le
 * FRAGMENT de l'URL (#access_token=...), invisible côté serveur puisque les
 * fragments ne sont jamais transmis au serveur — cette route ne peut donc
 * jamais les récupérer.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/feed";

  if (code) {
    const supabase = await createClient();
    try {
      const { data, error } = await Promise.race([
        supabase.auth.exchangeCodeForSession(code),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("verify_timeout")), VERIFY_TIMEOUT_MS))
      ]);
      if (!error && data.user) {
        const destination = await resolvePostAuthRedirect(supabase, data.user.id, next);
        return NextResponse.redirect(`${origin}${destination}`);
      }
    } catch {
      // Timeout ou erreur réseau — traité comme un code invalide ci-dessous.
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
