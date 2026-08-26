/**
 * Échappe le prénom avant de le fusionner dans un template HTML — sans ça,
 * un membre ayant mis du HTML/JS dans son prénom (ex: `<img src=x
 * onerror=...>`) s'exécuterait dans le navigateur de l'équipe au moment de
 * l'aperçu (rendu via `dangerouslySetInnerHTML` côté admin), et pas
 * seulement dans l'email final envoyé — un cas réel d'injection HTML/XSS
 * stocké trouvé en audit.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Remplace les balises de personnalisation par les vraies infos du destinataire — utilisé côté serveur (envoi) et client (aperçu). */
export function applyMergeTags(html: string, firstName: string): string {
  const safeFirstName = escapeHtml(firstName);
  return html.replaceAll("{{prenom}}", safeFirstName).replaceAll("{{Prenom}}", safeFirstName).replaceAll("{{PRENOM}}", safeFirstName.toUpperCase());
}
