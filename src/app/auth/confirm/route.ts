import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { resolvePostAuthRedirect } from "@/lib/supabase/post-auth-redirect";

/**
 * Point d'arrivée des liens envoyés par e-mail par Supabase Auth
 * (confirmation d'inscription, réinitialisation de mot de passe, changement
 * d'adresse email) — via `token_hash` + `verifyOtp()`, entièrement côté
 * serveur. Les gabarits d'email correspondants pointent ici avec
 * `?token_hash={{ .TokenHash }}&type=...` plutôt que d'utiliser
 * `{{ .ConfirmationURL }}` (le lien "clé en main" de Supabase Auth), qui
 * redirige avec les jetons dans le FRAGMENT de l'URL (#access_token=...) —
 * invisible côté serveur, ce qui faisait systématiquement échouer ces 3 flux
 * avant ce correctif (retour silencieux vers /login?error=...).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/feed";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && data.user) {
      const destination = await resolvePostAuthRedirect(supabase, data.user.id, next);
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
