import type { MaritalStatusType } from "@/lib/supabase/database.types";

/** Source unique des libellés — utilisée par l'onboarding (situation propre + situations recherchées) et par les cartes de profil. */
export const MARITAL_STATUS_LABELS: Record<MaritalStatusType, string> = {
  SINGLE_NO_CHILDREN: "Célibataire sans enfant",
  SINGLE_WITH_CHILDREN: "Célibataire avec enfant",
  DIVORCED: "Divorcé(e)",
  WIDOWED: "Veuf / Veuve"
};

export const MARITAL_STATUS_OPTIONS: { value: MaritalStatusType; label: string }[] = (
  Object.entries(MARITAL_STATUS_LABELS) as [MaritalStatusType, string][]
).map(([value, label]) => ({ value, label }));
