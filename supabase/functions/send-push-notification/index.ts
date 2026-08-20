// Envoie une notification push (Web Push standard, fonctionne dans Chrome,
// Firefox, Edge, et donc dans un futur TWA Android) à tous les appareils
// abonnés d'un membre. Déclenché synchroniquement par le trigger
// notify_push_on_notification() à chaque insertion dans `notifications` —
// hérite donc gratuitement des préférences déjà appliquées en amont
// (notify_messages, notify_likes, etc.) puisqu'une notification n'existe
// que si le membre les a activées.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(`mailto:support@agapeo.love`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

Deno.serve(async (req) => {
  try {
    const { recipientId, title, body, targetUrl } = await req.json();
    if (!recipientId || !title) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400 });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: "Clés VAPID manquantes" }), { status: 500 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: subscriptions } = await admin.from("push_subscriptions").select("*").eq("user_id", recipientId);
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ skipped: "Aucun abonnement push" }), { status: 200 });
    }

    const payload = JSON.stringify({
      title,
      body: body ?? "",
      url: targetUrl ? `${SITE_URL}${targetUrl}` : SITE_URL
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    // Abonnement expiré/révoqué (404/410) : on le retire pour ne plus retenter dans le vide.
    const staleIds: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const statusCode = (result.reason as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(subscriptions[i].id);
        }
      }
    });
    if (staleIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", staleIds);
    }

    return new Response(JSON.stringify({ success: true, sent: results.filter((r) => r.status === "fulfilled").length }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur inconnue" }), { status: 500 });
  }
});
