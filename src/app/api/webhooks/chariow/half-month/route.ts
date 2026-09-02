import { handleChariowWebhook } from "@/lib/chariow-webhook-handler";

/** Pulse Chariow du plan "mi-mois / 15 jours" (4 083 FCFA / 7$) — URL dédiée : Chariow interdit de réutiliser celle des autres plans sur un second Pulse. */
export async function POST(request: Request) {
  return handleChariowWebhook(request, "HALF_MONTH");
}
