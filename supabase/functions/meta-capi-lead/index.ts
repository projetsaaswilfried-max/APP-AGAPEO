// Relais serveur pour l'évènement Meta Conversions API "CompleteRegistration"
// (le "tag prospect" côté publicitaire). Déclenché synchroniquement par le
// trigger handle_new_user() (pg_net) à la création de la ligne `profiles` —
// donc exactement une fois par vrai compte créé, qu'il vienne du flux
// email/mot de passe ou de Google OAuth. Complète (ne remplace pas) le Pixel
// côté navigateur (src/components/analytics/meta-pixel.tsx) : même
// `event_id` des deux côtés pour que Meta déduplique au lieu de compter deux
// fois la même inscription.
import { requireServiceRole } from "../_shared/auth-guard.ts";

const META_PIXEL_ID = Deno.env.get("META_PIXEL_ID");
const META_CONVERSIONS_API_TOKEN = Deno.env.get("META_CONVERSIONS_API_TOKEN");
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  try {
    const { userId, email } = await req.json();
    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400 });
    }

    if (!META_PIXEL_ID || !META_CONVERSIONS_API_TOKEN) {
      // Pas configuré : on ne bloque jamais la création de compte pour ça.
      return new Response(JSON.stringify({ skipped: "Meta CAPI non configuré" }), { status: 200 });
    }

    const [hashedEmail, hashedUserId] = await Promise.all([
      sha256Hex(email.trim().toLowerCase()),
      sha256Hex(userId)
    ]);

    const res = await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: META_CONVERSIONS_API_TOKEN,
        data: [
          {
            event_name: "CompleteRegistration",
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            event_id: userId,
            event_source_url: `${SITE_URL}/onboarding`,
            user_data: { em: [hashedEmail], external_id: [hashedUserId] }
          }
        ]
      })
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Meta CAPI CompleteRegistration refusé (${res.status}) pour ${userId} :`, body);
      return new Response(JSON.stringify({ error: "Meta CAPI a refusé l'évènement" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur inconnue" }), { status: 500 });
  }
});
