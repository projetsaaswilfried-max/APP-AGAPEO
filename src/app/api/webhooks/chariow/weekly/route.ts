import { handleChariowWebhook } from "@/lib/chariow-webhook-handler";

/** Pulse Chariow du plan 1 semaine (4$) — ne pas renommer cette URL, elle est enregistrée telle quelle côté Chariow. */
export async function POST(request: Request) {
  return handleChariowWebhook(request, "WEEKLY");
}
