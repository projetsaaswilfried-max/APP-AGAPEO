import { handleChariowWebhook } from "@/lib/chariow-webhook-handler";

/** Pulse Chariow du plan "accès payant à l'inscription" (2 329 FCFA / 4$) — URL dédiée : Chariow interdit de réutiliser celle des autres plans sur un second Pulse. */
export async function POST(request: Request) {
  return handleChariowWebhook(request, "ACCESS");
}
