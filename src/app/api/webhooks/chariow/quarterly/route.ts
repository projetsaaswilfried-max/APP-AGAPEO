import { handleChariowWebhook } from "@/lib/chariow-webhook-handler";

/** Pulse Chariow du plan trimestriel (30$) — URL dédiée : Chariow interdit de réutiliser celle du mensuel sur un second Pulse. */
export async function POST(request: Request) {
  return handleChariowWebhook(request, "QUARTERLY");
}
