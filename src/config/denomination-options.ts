/**
 * Options de la liste déroulante "Confession chrétienne" — construites à
 * partir d'un relevé réel de production (8994 profils, 5052 confessions
 * renseignées en texte libre, 828 orthographes distinctes avant nettoyage :
 * ex. "Évangélique"/"Evangelique"/"évangélique"/"ÉVANGÉLIQUE"/"Evengelique"
 * désignaient tous la même chose). Ordonnées par fréquence réelle décroissante.
 */
export const DENOMINATION_OPTIONS = [
  "Évangélique",
  "Catholique",
  "Pentecôtiste",
  "Chrétien(ne)",
  "Protestant(e)",
  "Baptiste",
  "Église de réveil",
  "Assemblée de Dieu",
  "Méthodiste",
  "Christianisme Céleste",
  "Apostolique",
  "Adventiste",
  "Charismatique",
  "Kimbanguiste"
] as const;

export type DenominationOption = (typeof DENOMINATION_OPTIONS)[number];

/** Sélectionnée quand la confession de la personne ne correspond à aucune option ci-dessus — jamais perdue, juste précisée en texte libre à côté. */
export const DENOMINATION_OTHER = "Autre";

/**
 * Règles de reconnaissance par mot-clé plutôt qu'un dictionnaire exhaustif de
 * variantes exactes : plus robuste face aux fautes de frappe/accents déjà
 * observées, et couvre aussi les futures variantes sans maintenance. Ordre
 * important — les motifs les plus spécifiques passent avant les motifs
 * génériques (ex: "pentecôtiste" avant "chretien").
 */
const DENOMINATION_KEYWORD_RULES: [RegExp, DenominationOption][] = [
  [/pentecot/, "Pentecôtiste"],
  [/evangel/, "Évangélique"],
  [/catholi/, "Catholique"],
  [/protestant/, "Protestant(e)"],
  [/baptist/, "Baptiste"],
  [/reveil|reveill/, "Église de réveil"],
  [/assemblee de dieu/, "Assemblée de Dieu"],
  [/methodist/, "Méthodiste"],
  [/celeste/, "Christianisme Céleste"],
  [/apostoliq/, "Apostolique"],
  [/adventist/, "Adventiste"],
  [/charismatiq/, "Charismatique"],
  [/kimbangui/, "Kimbanguiste"],
  [/chretien/, "Chrétien(ne)"]
];

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Résout une valeur de confession (nouvelle sélection OU ancienne saisie
 * libre déjà en base) vers l'option canonique correspondante. Retourne
 * `isOther: true` quand rien ne correspond, avec `canonical` = la valeur
 * d'origine intacte (jamais tronquée ni perdue) pour l'afficher dans le champ
 * "Autre, précise".
 */
export function resolveDenomination(raw: string | null | undefined): { canonical: string; isOther: boolean } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { canonical: "", isOther: false };

  const normalized = stripAccents(trimmed.toLowerCase());
  for (const [pattern, option] of DENOMINATION_KEYWORD_RULES) {
    if (pattern.test(normalized)) return { canonical: option, isOther: false };
  }
  return { canonical: trimmed, isOther: true };
}
