"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { INTEREST_OPTIONS } from "@/config/interest-options";

/**
 * Liste des centres d'intérêt proposés en case à cocher — lue depuis la
 * table `interests` (gérable par l'équipe dans /admin/interests, lecture
 * publique sans authentification). Démarre avec la liste statique de secours
 * (`INTEREST_OPTIONS`, le seed d'origine) pour un premier rendu immédiat sans
 * effet de clignotement, puis la remplace dès que la vraie liste arrive —
 * ne change donc rien tant que l'équipe n'a jamais édité la table.
 */
export function useInterestOptions(): string[] {
  const [options, setOptions] = useState<string[]>(() => [...INTEREST_OPTIONS]);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("interests")
      .select("name")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled || error || !data || data.length === 0) return;
        setOptions((data as { name: string }[]).map((row) => row.name));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}
