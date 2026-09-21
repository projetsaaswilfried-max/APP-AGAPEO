/**
 * Options de la liste à cocher "Centres d'intérêt" — construites à partir
 * d'un relevé réel de production (8994 profils, ~9800 entrées de loisirs en
 * texte libre une fois éclatées sur les virgules) : ces ~23 options couvrent
 * l'essentiel des réponses réellement données, une fois les variantes
 * (singulier/pluriel, verbe/nom, casse) regroupées — ex. "Cuisine"/"cuisine"/
 * "La cuisine"/"Cuisiner" comptaient pour plus de 1150 occurrences à eux
 * seuls avant regroupement.
 */
export const INTEREST_OPTIONS = [
  "Cuisine",
  "Musique",
  "Lecture",
  "Sport",
  "Voyage",
  "Football",
  "Cinéma",
  "Randonnée",
  "Danse",
  "Chant",
  "Promenade",
  "Sortie",
  "Découverte",
  "Jeux vidéo",
  "Prière",
  "Méditation",
  "Basketball",
  "Natation",
  "Shopping",
  "Nature",
  "Plage",
  "Restaurant",
  "Bricolage"
] as const;

export type InterestOption = (typeof INTEREST_OPTIONS)[number];

/** Nombre maximum de centres d'intérêt sélectionnables — reprend la limite déjà en place sur l'ancien champ libre (`hobbies`/`passions`, 12 tags maximum). */
export const MAX_INTERESTS = 12;

/**
 * Règles de reconnaissance par mot-clé (même principe que
 * `resolveDenomination`) pour retrouver, dans une ancienne saisie libre
 * (potentiellement plusieurs loisirs dans une seule chaîne séparée par des
 * virgules — un défaut réel de l'ancien champ texte), les options
 * canoniques correspondantes.
 */
const INTEREST_KEYWORD_RULES: [RegExp, InterestOption][] = [
  [/cuisin/, "Cuisine"],
  [/^music|musiq/, "Musique"],
  [/lect|^lire$|^lis$/, "Lecture"],
  [/basket/, "Basketball"],
  [/foot/, "Football"],
  [/sport/, "Sport"],
  [/voyag|touris/, "Voyage"],
  [/cinema|^film|serie/, "Cinéma"],
  [/randonn/, "Randonnée"],
  [/dans/, "Danse"],
  [/chant/, "Chant"],
  [/promenad|balad|marche/, "Promenade"],
  [/sorti/, "Sortie"],
  [/decouvert/, "Découverte"],
  [/jeu/, "Jeux vidéo"],
  [/prier|priere/, "Prière"],
  [/meditat/, "Méditation"],
  [/natat|^nager$/, "Natation"],
  [/shopping/, "Shopping"],
  [/^nature$/, "Nature"],
  [/plage/, "Plage"],
  [/restaurant/, "Restaurant"],
  [/bricolage/, "Bricolage"]
];

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Reconnaît, dans une liste de valeurs éventuellement en texte libre
 * (ancien format), les options canoniques correspondantes — sert
 * uniquement à pré-cocher les cases déjà pertinentes quand une personne qui
 * avait rempli l'ancien champ libre ouvre le nouveau formulaire. Une entrée
 * qui ne correspond à aucun mot-clé connu est simplement ignorée (elle ne
 * peut plus être représentée dans une liste fermée) plutôt que de bloquer
 * l'affichage.
 */
export function resolveInterests(rawValues: string[]): InterestOption[] {
  const resolved = new Set<InterestOption>();
  for (const raw of rawValues) {
    for (const fragment of raw.split(/[,;/]/)) {
      const normalized = stripAccents(fragment.trim().toLowerCase());
      if (!normalized) continue;
      const match = INTEREST_KEYWORD_RULES.find(([pattern]) => pattern.test(normalized));
      if (match) resolved.add(match[1]);
    }
  }
  return [...resolved];
}
