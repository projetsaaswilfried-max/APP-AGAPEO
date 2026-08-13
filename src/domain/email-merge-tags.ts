/** Remplace les balises de personnalisation par les vraies infos du destinataire — utilisé côté serveur (envoi) et client (aperçu). */
export function applyMergeTags(html: string, firstName: string): string {
  return html.replaceAll("{{prenom}}", firstName).replaceAll("{{Prenom}}", firstName).replaceAll("{{PRENOM}}", firstName.toUpperCase());
}
