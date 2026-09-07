import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { resolvePostAuthRedirect } from "@/lib/supabase/post-auth-redirect";

// Vérifié en direct le 2026-09-07 (compte jetable, contre la vraie API) :
// quand le token est déjà utilisé/expiré, l'API Supabase Auth elle-même met
// jusqu'à PLUSIEURS MINUTES à répondre au lieu de renvoyer rapidement une
// erreur "otp_expired" — jusqu'au timeout max d'une fonction Vercel (504),
// voire un 522 Cloudflare en appelant leur API directement, sans passer par
// nous. Panne réelle côté Supabase, pas un bug introduit ici — mais sans
// notre propre délai limite, la page reste bloquée en chargement pendant
// tout ce temps avant d'échouer, ce qui ressemble à "le site ne marche pas"
// plutôt qu'à un message clair de lien expiré (signalé par un membre :
// plusieurs jours à réessayer sans comprendre pourquoi). On ne peut pas
// réparer la lenteur de Supabase, seulement ne plus jamais l'attendre aussi
// longtemps.
const VERIFY_TIMEOUT_MS = 8000;

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
    try {
      const { data, error } = await Promise.race([
        supabase.auth.verifyOtp({ type, token_hash: tokenHash }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("verify_timeout")), VERIFY_TIMEOUT_MS))
      ]);
      if (!error && data.user) {
        const destination = await resolvePostAuthRedirect(supabase, data.user.id, next);
        return NextResponse.redirect(`${origin}${destination}`);
      }
    } catch {
      // Timeout (Supabase qui traîne) ou erreur réseau — traité comme un lien invalide ci-dessous.
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
