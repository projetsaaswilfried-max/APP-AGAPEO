import { handleSasPayWebhook } from "@/lib/saspay-webhook-handler";

/** Point de réception SasPay unique (tous events/produits confondus) — ne pas renommer cette URL, à enregistrer telle quelle dans leur tableau de bord (Webhooks). */
export async function POST(request: Request) {
  return handleSasPayWebhook(request);
}
