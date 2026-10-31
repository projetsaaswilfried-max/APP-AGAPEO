// Doit rester synchronisé avec src/config/support.ts — les Edge Functions
// Deno ne résolvent pas les alias "@/...", d'où cette copie partagée entre
// toutes les fonctions plutôt qu'une duplication dans chacune.

export const SUPPORT_WHATSAPP_NUMBER = "18733007552";
export const SUPPORT_WHATSAPP_DISPLAY = "+1 (873) 300-7552";

export type SupportTopic = "GENERAL" | "VERIFICATION_REJECTED" | "VERIFICATION_STUCK" | "PAYMENT_FAILED" | "SUBSCRIPTION_EXPIRED";

const TOPIC_MESSAGES: Record<SupportTopic, string> = {
  GENERAL: "Bonjour, j'ai besoin d'aide sur Agapeo.",
  VERIFICATION_REJECTED: "Bonjour, ma vérification de profil a été refusée sur Agapeo et j'aimerais comprendre pourquoi.",
  VERIFICATION_STUCK: "Bonjour, je n'arrive pas à soumettre mon profil pour vérification sur Agapeo.",
  PAYMENT_FAILED: "Bonjour, mon paiement n'est pas passé sur Agapeo et je n'ai pas eu accès à l'abonnement.",
  SUBSCRIPTION_EXPIRED: "Bonjour, j'ai une question sur mon abonnement Agapeo."
};

export function buildSupportWhatsAppUrl(topic: SupportTopic = "GENERAL"): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(TOPIC_MESSAGES[topic])}`;
}

export function buildSupportWhatsAppEmailBlock(topic: SupportTopic = "GENERAL", intro = "Un blocage, une question ?"): string {
  return `<div style="margin:20px 0 0 0;padding:14px 16px;background:#F4F6F8;border-radius:12px;font-size:13px;line-height:1.6;color:#334155;">${intro} Écris-nous directement sur WhatsApp, on règle ça avec toi : <a href="${buildSupportWhatsAppUrl(topic)}" style="color:#25D366;font-weight:600;text-decoration:none;">${SUPPORT_WHATSAPP_DISPLAY}</a></div>`;
}

export function buildSupportWhatsAppMessageLine(topic: SupportTopic = "GENERAL"): string {
  return `Si ça coince, écris-nous directement sur WhatsApp (${SUPPORT_WHATSAPP_DISPLAY}) : ${buildSupportWhatsAppUrl(topic)}`;
}
