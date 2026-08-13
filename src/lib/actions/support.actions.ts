"use server";

import { createClient } from "@/lib/supabase/server";
import { getResendApiKey, getSupportEmail, env } from "@/config/env";
import { buildAgapeoEmailHtml } from "@/lib/email-template";

/**
 * Notifie l'équipe par email qu'un membre vient d'écrire dans un dossier de
 * support — le message lui-même est déjà en base (support_messages, écrit
 * côté client via support.service.ts, protégé par RLS) ; cette action ne
 * fait qu'ajouter le canal email demandé, sans jamais être la seule trace du
 * message.
 */
export async function notifyStaffOfSupportMessageAction(ticketId: string, subject: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data: profile } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single();
  const name = profile ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : "Un membre";

  try {
    const apiKey = getResendApiKey();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Agapeo <support@agapeo.love>",
        to: [getSupportEmail()],
        reply_to: user.email,
        subject: `Support — ${subject}`,
        html: buildAgapeoEmailHtml({
          title: "Nouveau message support",
          preheader: `${name} vient d'écrire dans un dossier support`,
          eyebrow: "SUPPORT",
          headline: subject,
          contentHtml: `<div style="background:#F4F6F8;border-radius:12px;padding:14px 16px;color:#334155;font-size:14px;line-height:1.6;white-space:pre-line;">${content}</div>`,
          infoRows: [
            { label: "De", value: name },
            { label: "Email", value: user.email ?? "inconnu" }
          ],
          ctaText: "Répondre depuis l'espace admin",
          ctaUrl: `${env.siteUrl}/admin/support?ticket=${ticketId}`
        })
      })
    });

    if (!res.ok) {
      const body = await res.text();
      return { error: `Email non envoyé (message bien enregistré) : ${body}` };
    }
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Email non envoyé (message bien enregistré)." };
  }
}
