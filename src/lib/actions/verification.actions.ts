"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isProfileComplete } from "@/domain/profile-completeness";
import { sendVerificationEmail } from "@/lib/verification-emails";
import type { ProfileRow } from "@/lib/supabase/database.types";

/**
 * Soumission d'une demande de vérification par le membre lui-même.
 *
 * `selfieStoragePath` : un selfie pris en direct (caméra, jamais un fichier
 * importé — cf. `SelfieCaptureModal`/`OnboardingSelfieStep`) que l'équipe
 * compare aux photos déjà postées avant de valider. Sans ça, n'importe qui
 * pouvait poster les photos de quelqu'un d'autre (influenceur, photo trouvée
 * en ligne) et se faire "vérifier" sans jamais montrer son vrai visage.
 * Optionnel ici : si absent, on retombe sur `profiles.pending_selfie_storage_path`
 * — capturé plus tôt via l'étape dédiée de l'onboarding (juste après les
 * photos) plutôt qu'au moment même de la soumission finale. Un des deux doit
 * être présent, sans quoi la soumission est refusée comme avant.
 *
 * `profiles.photo_verification_status` est protégé par le trigger
 * `protect_privileged_profile_columns()` — même le propriétaire de la ligne
 * ne peut pas le faire passer à PENDING via le client authentifié normal.
 * Cette action insère donc le dossier via le client authentifié (RLS :
 * user_id = auth.uid() suffit), puis bascule le badge public via le client
 * service_role pour ce seul champ — même pattern que `deleteAccountAction`.
 */
export async function submitVerificationRequestAction(selfieStoragePath?: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileData as ProfileRow | null;
  if (!profile) return { error: "Profil introuvable." };

  const resolvedSelfiePath = selfieStoragePath || profile.pending_selfie_storage_path;
  if (!resolvedSelfiePath) return { error: "Le selfie de vérification est obligatoire." };

  if (!isProfileComplete(profile)) {
    return { error: "Complète d'abord ton profil (photo, confession, vision du mariage) avant de soumettre pour vérification." };
  }
  if (profile.photo_verification_status === "PENDING") {
    return { error: "Une demande est déjà en cours de traitement." };
  }
  if (profile.photo_verification_status === "VERIFIED") {
    return { error: "Ton profil est déjà vérifié." };
  }

  const { data: restricted } = await supabase.from("profile_restricted").select("subscription_status").eq("id", user.id).single();
  const isPriority = restricted?.subscription_status === "ACTIVE";

  const { error: insertError } = await supabase
    .from("verification_requests")
    .insert({ user_id: user.id, is_priority: isPriority, selfie_storage_path: resolvedSelfiePath });
  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "Une demande est déjà en cours de traitement." };
    }
    return { error: insertError.message };
  }

  const admin = createAdminClient();
  const { error: statusError } = await admin.from("profiles").update({ photo_verification_status: "PENDING" }).eq("id", user.id);
  if (statusError) return { error: statusError.message };

  // Les photos ajoutées pendant l'onboarding n'étaient que des brouillons
  // (DRAFT, cf. addProfilePhotoAction) — la soumission réelle les fait
  // officiellement entrer dans la file de modération de l'équipe, en même
  // temps que le profil. Passe par le client service_role : le trigger
  // `protect_photo_moderation_status()` interdit au propriétaire lui-même de
  // changer ce statut.
  await admin.from("profile_photos").update({ moderation_status: "PENDING" }).eq("profile_id", user.id).eq("moderation_status", "DRAFT");

  // Vidé une fois consommé — une future re-soumission (après un refus) doit
  // toujours repartir d'un selfie fraîchement repris, jamais de celui-ci.
  if (profile.pending_selfie_storage_path) {
    await supabase.from("profiles").update({ pending_selfie_storage_path: null }).eq("id", user.id);
  }

  await supabase.from("onboarding_events").insert({ user_id: user.id, event_type: "VERIFICATION_SUBMITTED" });

  await sendVerificationEmail({
    to: user.email!,
    firstName: profile.first_name,
    kind: "SUBMITTED",
    isPriority
  });

  revalidatePath("/profile");
  return { success: true };
}
