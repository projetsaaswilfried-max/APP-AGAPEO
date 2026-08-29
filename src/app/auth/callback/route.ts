import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePostAuthRedirect } from "@/lib/supabase/post-auth-redirect";

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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const destination = await resolvePostAuthRedirect(supabase, data.user.id, next);
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
