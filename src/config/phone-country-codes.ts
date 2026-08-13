export interface PhoneCountryCode {
  /** Code pays ISO alpha-2 — c'est ce que l'API Chariow attend dans `phone.country_code` (pas l'indicatif +XX). */
  code: string;
  label: string;
}

/** Pays supportés (cf. config/countries.ts), avec leur code ISO alpha-2 — utilisé pour le paiement Chariow. */
export const PHONE_COUNTRY_CODES: PhoneCountryCode[] = [
  { code: "CI", label: "Côte d'Ivoire (+225)" },
  { code: "FR", label: "France (+33)" },
  { code: "BE", label: "Belgique (+32)" },
  { code: "CH", label: "Suisse (+41)" },
  { code: "CA", label: "Canada (+1)" },
  { code: "US", label: "États-Unis (+1)" },
  { code: "CM", label: "Cameroun (+237)" },
  { code: "CD", label: "RD Congo (+243)" },
  { code: "CG", label: "Congo-Brazzaville (+242)" },
  { code: "SN", label: "Sénégal (+221)" },
  { code: "BJ", label: "Bénin (+229)" },
  { code: "TG", label: "Togo (+228)" },
  { code: "GA", label: "Gabon (+241)" },
  { code: "ML", label: "Mali (+223)" },
  { code: "BF", label: "Burkina Faso (+226)" },
  { code: "MG", label: "Madagascar (+261)" },
  { code: "HT", label: "Haïti (+509)" },
  { code: "GB", label: "Royaume-Uni (+44)" }
];
