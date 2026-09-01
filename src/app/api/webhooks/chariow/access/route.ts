import { handleChariowWebhook } from "@/lib/chariow-webhook-handler";

/** Pulse Chariow du plan "accès complet" (4 083 FCFA / 7$) — URL dédiée : Chariow interdit de réutiliser celle des autres plans sur un second Pulse. */
export async function POST(request: Request) {
  return handleChariowWebhook(request, "ACCESS");
}
