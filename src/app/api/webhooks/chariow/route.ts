import { handleChariowWebhook } from "@/lib/chariow-webhook-handler";

/** Pulse Chariow unique — couvre tous les plans (WEEKLY/HALF_MONTH/MONTHLY/QUARTERLY). Ne pas renommer cette URL, elle est enregistrée telle quelle côté Chariow. */
export async function POST(request: Request) {
  return handleChariowWebhook(request);
}
