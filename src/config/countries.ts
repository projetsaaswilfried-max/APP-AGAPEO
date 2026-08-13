export const SUPPORTED_COUNTRIES = [
  "France",
  "Belgique",
  "Suisse",
  "Canada",
  "Côte d'Ivoire",
  "Cameroun",
  "République Démocratique du Congo",
  "Congo-Brazzaville",
  "Sénégal",
  "Bénin",
  "Togo",
  "Gabon",
  "Mali",
  "Burkina Faso",
  "Madagascar",
  "Haïti",
  "États-Unis",
  "Royaume-Uni",
  "Autre"
] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];
