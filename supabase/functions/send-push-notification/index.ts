// Envoie une notification push à tous les appareils abonnés d'un membre, sur
// deux canaux indépendants :
//  - Web Push standard (VAPID) — Chrome/Firefox/Edge, cf. `push_subscriptions`.
//  - FCM (Firebase Cloud Messaging) — app mobile native (iOS/Android), cf.
//    `device_tokens`. Nécessite un compte de service Firebase (secrets
//    FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY) : tant
//    qu'ils ne sont pas configurés, ce canal est simplement ignoré (aucune
//    erreur, comme le webhook Chariow avant sa mise en service).
// Déclenché synchroniquement par le trigger notify_push_on_notification() à
// chaque insertion dans `notifications` — hérite donc gratuitement des
// préférences déjà appliquées en amont (notify_messages, notify_likes...)
// puisqu'une notification n'existe que si le membre les a activées. Chaque
// canal échoue/réussit indépendamment : l'absence de l'un n'empêche jamais l'autre.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID");
const FIREBASE_CLIENT_EMAIL = Deno.env.get("FIREBASE_CLIENT_EMAIL");
const FIREBASE_PRIVATE_KEY = Deno.env.get("FIREBASE_PRIVATE_KEY");

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(`mailto:support@agapeo.love`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushEvent {
  recipientId: string;
  title: string;
  body?: string;
  targetUrl?: string;
}

async function sendWebPush(admin: ReturnType<typeof createClient>, event: PushEvent) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return { skipped: "Clés VAPID non configurées" };

  const { data: subscriptions } = await admin.from("push_subscriptions").select("*").eq("user_id", event.recipientId);
  if (!subscriptions || subscriptions.length === 0) return { skipped: "Aucun abonnement web" };

  const payload = JSON.stringify({
    title: event.title,
    body: event.body ?? "",
    url: event.targetUrl ? `${SITE_URL}${event.targetUrl}` : SITE_URL
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload))
  );

  // Abonnement expiré/révoqué (404/410) : on le retire pour ne plus retenter dans le vide.
  const staleIds = results
    .map((result, i) => ({ result, id: subscriptions[i].id }))
    .filter(({ result }) => result.status === "rejected" && [404, 410].includes((result.reason as { statusCode?: number })?.statusCode ?? 0))
    .map(({ id }) => id);
  if (staleIds.length > 0) await admin.from("push_subscriptions").delete().in("id", staleIds);

  return { sent: results.filter((r) => r.status === "fulfilled").length, total: subscriptions.length };
}

// ---------------------------------------------------------------------------
// FCM (HTTP v1) — l'ancienne API "legacy" (clé serveur simple) est fermée par
// Google ; l'API v1 exige un jeton OAuth2 obtenu via un compte de service,
// signé ici avec Web Crypto (RS256) plutôt qu'une dépendance Firebase Admin
// lourde et mal adaptée à un environnement Edge Function.
// ---------------------------------------------------------------------------

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  // Les secrets Supabase/CI échappent souvent les retours à la ligne d'une clé
  // PEM en "\n" littéral — restauré avant de retirer l'enveloppe PEM.
  const normalized = pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
  const base64 = normalized.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Mis en cache au niveau du module : réutilisé d'un appel à l'autre tant que
// l'instance de la fonction reste "chaude" (courant sur Deno Deploy), pour ne
// pas re-signer un JWT et refaire un aller-retour OAuth2 à chaque notification.
let cachedFcmToken: { value: string; expiresAt: number } | null = null;

async function getFcmAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedFcmToken && cachedFcmToken.expiresAt > now + 60) return cachedFcmToken.value;

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(FIREBASE_PRIVATE_KEY!),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt })
  });
  if (!res.ok) throw new Error(`Échec d'obtention du jeton FCM : ${await res.text()}`);

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedFcmToken = { value: data.access_token, expiresAt: now + (data.expires_in ?? 3600) };
  return cachedFcmToken.value;
}

/** `true` si Google signale un jeton mort (désinstallé, réinitialisé...) — jamais retenté. */
function isUnregisteredFcmError(errBody: unknown): boolean {
  const status = (errBody as { error?: { status?: string } })?.error?.status;
  return status === "UNREGISTERED" || status === "NOT_FOUND" || status === "INVALID_ARGUMENT";
}

async function sendFcmPush(admin: ReturnType<typeof createClient>, event: PushEvent) {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return { skipped: "Identifiants Firebase non configurés" };
  }

  const { data: tokens } = await admin.from("device_tokens").select("*").eq("user_id", event.recipientId);
  if (!tokens || tokens.length === 0) return { skipped: "Aucun appareil mobile enregistré" };

  const accessToken = await getFcmAccessToken();

  const outcomes = await Promise.allSettled(
    tokens.map(async (device) => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          message: {
            token: device.token,
            notification: { title: event.title, body: event.body ?? "" },
            data: event.targetUrl ? { targetUrl: event.targetUrl } : undefined
          }
        })
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (isUnregisteredFcmError(errBody)) {
          const error = new Error("unregistered");
          (error as Error & { deviceId?: string }).deviceId = device.id;
          throw error;
        }
        throw new Error(JSON.stringify(errBody));
      }
    })
  );

  const staleIds = outcomes
    .filter((o): o is PromiseRejectedResult => o.status === "rejected")
    .map((o) => (o.reason as Error & { deviceId?: string }).deviceId)
    .filter((id): id is string => Boolean(id));
  if (staleIds.length > 0) await admin.from("device_tokens").delete().in("id", staleIds);

  return { sent: outcomes.filter((o) => o.status === "fulfilled").length, total: tokens.length };
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  try {
    const event = (await req.json()) as PushEvent;
    if (!event.recipientId || !event.title) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const [web, fcm] = await Promise.all([
      sendWebPush(admin, event).catch((err) => ({ error: err instanceof Error ? err.message : "Erreur web push" })),
      sendFcmPush(admin, event).catch((err) => ({ error: err instanceof Error ? err.message : "Erreur FCM" }))
    ]);

    return new Response(JSON.stringify({ success: true, web, fcm }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur inconnue" }), { status: 500 });
  }
});
