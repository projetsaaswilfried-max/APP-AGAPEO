import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Point d'arrivée des liens envoyés par e-mail par Supabase Auth
 * (confirmation d'inscription, réinitialisation de mot de passe) et de la
 * connexion Google (OAuth). Échange le `code` PKCE contre une session, puis
 * redirige.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/feed";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // "/feed" est la destination générique (inscription confirmée,
      // première connexion Google) — jamais une destination explicitement
      // voulue par l'appelant (ex: `/reset-password` pour la réinitialisation
      // de mot de passe, préservée telle quelle). Un compte qui n'a pas
      // encore terminé son profil est envoyé directement vers l'onboarding
      // plutôt que sur le fil d'actualité, pour ne pas compter uniquement sur
      // le bandeau de rappel pour l'y amener de lui-même.
      if (next === "/feed" && data.user) {
        const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("id", data.user.id).maybeSingle();
        if (profile && !profile.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
