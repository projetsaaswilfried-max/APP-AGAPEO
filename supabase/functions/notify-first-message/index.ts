// Envoie un email au destinataire du tout premier message d'une nouvelle
// conversation, pour l'inciter à se connecter et répondre. Déclenché
// synchroniquement par le trigger notify_first_message_email() (pg_net)
// à chaque insertion dans `messages`, filtré côté DB au premier message.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  try {
    const { recipientId, senderId, conversationId } = await req.json();
    if (!recipientId || !senderId || !conversationId) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: recipientProfile }, { data: senderProfile }, { data: authUser }] = await Promise.all([
      admin.from("profiles").select("first_name, notify_messages").eq("id", recipientId).single(),
      admin.from("profiles").select("first_name").eq("id", senderId).single(),
      admin.auth.admin.getUserById(recipientId)
    ]);

    if (!recipientProfile?.notify_messages) {
      return new Response(JSON.stringify({ skipped: "Notifications désactivées" }), { status: 200 });
    }

    const email = authUser?.user?.email;
    if (!email) {
      return new Response(JSON.stringify({ skipped: "Email introuvable" }), { status: 200 });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY manquant" }), { status: 500 });
    }

    const senderName = senderProfile?.first_name ?? "Un membre";
    const html = buildAgapeoEmailHtml({
      title: "Nouveau message sur Agapeo",
      preheader: `${senderName} vous a envoyé un message`,
      eyebrow: "NOUVEAU MESSAGE",
      headline: `${senderName} vous a envoyé un message`,
      recipientFirstName: recipientProfile.first_name,
      contentHtml: `<p style="margin:0;">${senderName} vient de vous écrire pour la première fois sur Agapeo. Connectez-vous pour lire son message et lui répondre.</p>`,
      ctaText: "Lire le message",
      ctaUrl: `${SITE_URL}/messages?conversation=${conversationId}`
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `${senderName} vous a envoyé un message sur Agapeo`,
        html
      })
    });

    if (!res.ok) {
      const body = await res.text();
      return new Response(JSON.stringify({ error: `Resend a refusé l'envoi (${res.status}) : ${body}` }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur inconnue" }), { status: 500 });
  }
});
