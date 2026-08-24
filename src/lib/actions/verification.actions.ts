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
 * `selfieStoragePath` est obligatoire : un selfie pris en direct (caméra,
 * jamais un fichier importé — cf. `SelfieCaptureModal`) que l'équipe compare
 * aux photos déjà postées avant de valider. Sans ça, n'importe qui pouvait
 * poster les photos de quelqu'un d'autre (influenceur, photo trouvée en
 * ligne) et se faire "vérifier" sans jamais montrer son vrai visage.
 *
 * `profiles.photo_verification_status` est protégé par le trigger
 * `protect_privileged_profile_columns()` — même le propriétaire de la ligne
 * ne peut pas le faire passer à PENDING via le client authentifié normal.
 * Cette action insère donc le dossier via le client authentifié (RLS :
 * user_id = auth.uid() suffit), puis bascule le badge public via le client
 * service_role pour ce seul champ — même pattern que `deleteAccountAction`.
 */
export async function submitVerificationRequestAction(selfieStoragePath: string) {
  if (!selfieStoragePath) return { error: "Le selfie de vérification est obligatoire." };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileData as ProfileRow | null;
  if (!profile) return { error: "Profil introuvable." };

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
    .insert({ user_id: user.id, is_priority: isPriority, selfie_storage_path: selfieStoragePath });
  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "Une demande est déjà en cours de traitement." };
    }
    return { error: insertError.message };
  }

  const admin = createAdminClient();
  const { error: statusError } = await admin.from("profiles").update({ photo_verification_status: "PENDING" }).eq("id", user.id);
  if (statusError) return { error: statusError.message };

  await sendVerificationEmail({
    to: user.email!,
    firstName: profile.first_name,
    kind: "SUBMITTED",
    isPriority
  });

  revalidatePath("/profile");
  return { success: true };
}
