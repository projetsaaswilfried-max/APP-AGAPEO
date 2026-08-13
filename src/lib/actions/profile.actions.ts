"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileEditablePartialSchema, PhoneSchema, EssentialInfoSchema } from "@/lib/validation/profile.schema";
import type { ProfileUpdate } from "@/lib/supabase/database.types";

export async function updateProfileAction(updates: Partial<ProfileUpdate>) {
  const parsed = ProfileEditablePartialSchema.safeParse(updates);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données de profil invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/discover");
  return { success: true };
}

/**
 * Réservée aux comptes créés par OAuth (Google) : `gender`/`birth_date`/
 * `country` y sont NULL juste après la création. Ces champs sont
 * volontairement absents de `ProfileEditableSchema` (posés une fois, non
 * modifiables ensuite) — cette action ne fait rien si l'un d'eux est déjà
 * renseigné, pour ne jamais devenir une porte dérobée de modification.
 */
export async function completeEssentialInfoAction(input: unknown) {
  const parsed = EssentialInfoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { data: existing } = await supabase.from("profiles").select("gender, birth_date, country").eq("id", user.id).single();
  if (existing?.gender && existing?.birth_date && existing?.country) {
    return { success: true };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ gender: parsed.data.gender, birth_date: parsed.data.birthDate, country: parsed.data.country })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/onboarding");
  return { success: true };
}

export async function updatePhoneAction(phone: string | null, phoneCountryCode: string | null) {
  const parsed = PhoneSchema.safeParse({ phone, phone_country_code: phoneCountryCode });
  if (!parsed.success) return { error: "Numéro de téléphone invalide." };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { error } = await supabase
    .from("profile_private")
    .update({ phone: parsed.data.phone, phone_country_code: parsed.data.phone_country_code })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Marque l'onboarding comme terminé — que le profil soit complet ou non.
 * L'onboarding ne bloque jamais l'accès à l'application (règle produit :
 * "possibilité de le faire plus tard") : c'est `isProfileComplete()` /
 * `discoverService` qui décide séparément si le profil est assez rempli
 * pour être proposé aux autres membres dans Découvrir. Utilisée à la fois
 * par "Terminer mon profil" (dernière étape) et "Plus tard" (n'importe
 * quelle étape).
 */
export async function completeOnboardingAction() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ onboarding_completed: true, onboarding_step: 5 }).eq("id", user.id);
  redirect("/");
}

export async function saveOnboardingStepAction(step: number) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  await supabase.from("profiles").update({ onboarding_step: step }).eq("id", user.id);
  return { success: true };
}

export async function addProfilePhotoAction(url: string, storagePath: string, isPrimary: boolean) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  if (isPrimary) {
    await supabase.from("profile_photos").update({ is_primary: false }).eq("profile_id", user.id);
  }

  const { data, error } = await supabase
    .from("profile_photos")
    .insert({ profile_id: user.id, url, storage_path: storagePath, is_primary: isPrimary })
    .select()
    .single();

  if (error) return { error: error.message };

  if (isPrimary) {
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  }

  revalidatePath("/profile");
  return { success: true, photo: data };
}

export async function removeProfilePhotoAction(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data: photo } = await supabase.from("profile_photos").select("storage_path").eq("id", photoId).single();
  await supabase.from("profile_photos").delete().eq("id", photoId).eq("profile_id", user.id);
  if (photo?.storage_path) {
    await supabase.storage.from("avatars").remove([photo.storage_path]);
  }

  revalidatePath("/profile");
  return { success: true };
}

/**
 * Suppression de compte : passe par l'API Admin Auth (service_role) car la
 * suppression d'un utilisateur `auth.users` n'est pas exposée aux clients —
 * elle entraîne la suppression en cascade de `profiles` et de toutes les
 * données associées (FKs `on delete cascade`).
 */
export async function deleteAccountAction() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user!.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Export de mes données personnelles (droit à la portabilité). Passe par le
 * client authentifié classique (pas service_role) : la RLS garantit à elle
 * seule qu'on ne peut jamais exporter les données d'un autre membre.
 */
export async function exportMyDataAction() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const [
    { data: profile },
    { data: privateData },
    { data: photos },
    { data: posts },
    { data: comments },
    { data: favorites },
    { data: sentMessages },
    { data: notifications },
    { data: transactions },
    { data: profileViews }
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("profile_private").select("phone, phone_country_code").eq("id", user.id).maybeSingle(),
    supabase.from("profile_photos").select("*").eq("profile_id", user.id),
    supabase.from("posts").select("*").eq("author_id", user.id),
    supabase.from("post_comments").select("*").eq("author_id", user.id),
    supabase.from("favorites").select("*").eq("user_id", user.id),
    supabase.from("messages").select("id, conversation_id, type, content, status, created_at").eq("sender_id", user.id),
    supabase.from("notifications").select("*").eq("recipient_id", user.id),
    supabase.from("transactions").select("*").eq("user_id", user.id),
    supabase.from("profile_views").select("viewed_profile_id, created_at").eq("viewer_id", user.id)
  ]);

  return {
    success: true,
    data: {
      exportedAt: new Date().toISOString(),
      account: { id: user.id, email: user.email, createdAt: user.created_at },
      profile,
      privatePhone: privateData,
      photos,
      personalPublications: posts,
      comments,
      favorites,
      messagesSent: sentMessages,
      notifications,
      transactions,
      profileVisitsIMade: profileViews
    }
  };
}
