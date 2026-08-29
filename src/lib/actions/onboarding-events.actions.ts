"use server";

import { createClient } from "@/lib/supabase/server";
import type { OnboardingEventType } from "@/lib/supabase/database.types";

/**
 * Suivi minimal, étape par étape, de la progression dans l'onboarding — sans
 * ça, impossible de savoir où les gens abandonnent réellement (avant, seul
 * "inscrit" vs "a acheté Premium" était mesuré côté Meta Pixel). Purement
 * analytique : ne bloque jamais le parcours si l'écriture échoue.
 */
export async function logOnboardingEventAction(eventType: OnboardingEventType, stepKey?: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("onboarding_events").insert({ user_id: user.id, event_type: eventType, step_key: stepKey ?? null });
  } catch {
    // Best-effort — un événement d'analytique manqué ne doit jamais gêner l'utilisateur.
  }
}
