// Passerelle mobile → web pour le paiement Premium. Le paiement (Chariow,
// SasPay ou Stripe) reste entièrement un flux web — cette fonction ne change
// rien à ce système, elle donne juste au membre mobile un lien à usage
// unique qui ouvre une VRAIE session web pour lui, sans qu'il ait à se
// connecter manuellement (email/mot de passe qu'il n'a peut-être jamais
// utilisés s'il ne connaît que l'app mobile).
//
// Principe : on réutilise le mécanisme de lien magique déjà en place côté
// web (`/auth/confirm`, `token_hash` + `verifyOtp`, cf. son commentaire
// dédié) — Supabase Auth génère lui-même un jeton aléatoire à usage unique
// (`generateLink`), on construit juste l'URL vers NOTRE route existante
// plutôt que d'utiliser le lien "clé en main" de Supabase (qui pointerait
// vers leur propre domaine). Le type "magiclink" n'est utilisé nulle part
// ailleurs dans l'app (confirmé) — aucun risque d'interférer avec un autre
// flux de connexion en le détournant ici.
//
// Sécurité : l'appelant doit présenter son PROPRE jeton d'accès Supabase
// (celui de sa session mobile déjà active) — `admin.auth.getUser(token)`
// échoue pour toute valeur qui n'est pas un vrai jeton de session utilisateur
// (la clé anon publique, par exemple, ne résout vers aucun utilisateur).
// Cette fonction ne fait jamais confiance à un `user_id` fourni dans le corps
// de la requête — toujours celui résolu depuis le jeton lui-même.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Non autorisé." }), { status: 401 });
  }
  const accessToken = authHeader.slice("Bearer ".length);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user?.email) {
    return new Response(JSON.stringify({ error: "Session invalide." }), { status: 401 });
  }

  // Plan optionnel à présélectionner (cf. /premium?plan=... déjà géré côté
  // web par premium/page.tsx, qui ignore silencieusement une valeur non
  // reconnue — aucune revalidation nécessaire ici).
  let next = "/premium";
  const body = await req.json().catch(() => null);
  if (body?.plan && typeof body.plan === "string") {
    next = `/premium?plan=${encodeURIComponent(body.plan)}`;
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
    options: { redirectTo: SITE_URL }
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("Échec de génération du lien de handoff :", linkError?.message);
    return new Response(JSON.stringify({ error: "Le lien n'a pas pu être généré." }), { status: 500 });
  }

  const url = `${SITE_URL}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`;

  return new Response(JSON.stringify({ url }), { headers: { "Content-Type": "application/json" } });
});
