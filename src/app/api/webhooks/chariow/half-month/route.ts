import { handleChariowWebhook } from "@/lib/chariow-webhook-handler";

/** Pulse Chariow du plan mi-mois / 15 jours (7$) — ne pas renommer cette URL, elle est enregistrée telle quelle côté Chariow. */
export async function POST(request: Request) {
  return handleChariowWebhook(request, "HALF_MONTH");
}
