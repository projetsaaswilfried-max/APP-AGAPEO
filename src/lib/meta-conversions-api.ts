import "server-only";
import crypto from "node:crypto";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const META_CONVERSIONS_API_TOKEN = process.env.META_CONVERSIONS_API_TOKEN;

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

interface MetaPurchaseEventInput {
  eventId: string;
  email: string;
  userId: string;
  value: number;
  currency: string;
  eventSourceUrl: string;
}

/**
 * Évènement Meta Conversions API "Purchase", envoyé depuis le webhook Chariow
 * (server-only, jamais depuis le navigateur). Complète (ne remplace pas) le
 * Pixel côté navigateur sur /premium/success : même `eventId` des deux côtés
 * (dérivé de user + échéance de la période, cf. ce fichier appelant) pour que
 * Meta déduplique au lieu de compter deux fois le même paiement. Best-effort :
 * une erreur ici ne doit jamais faire échouer le traitement du webhook — le
 * paiement et l'activation Premium restent la source de vérité.
 */
export async function sendMetaPurchaseEvent({ eventId, email, userId, value, currency, eventSourceUrl }: MetaPurchaseEventInput) {
  if (!META_PIXEL_ID || !META_CONVERSIONS_API_TOKEN) return;

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: META_CONVERSIONS_API_TOKEN,
        data: [
          {
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            event_id: eventId,
            event_source_url: eventSourceUrl,
            user_data: {
              em: [sha256Hex(email.trim().toLowerCase())],
              external_id: [sha256Hex(userId)]
            },
            custom_data: { value, currency }
          }
        ]
      })
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Meta CAPI Purchase refusé (${res.status}) pour ${eventId} :`, body);
    }
  } catch (err) {
    console.error(`Échec d'envoi de l'évènement Meta CAPI Purchase pour ${eventId} :`, err instanceof Error ? err.message : err);
  }
}
