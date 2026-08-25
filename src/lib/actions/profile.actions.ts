"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileEditablePartialSchema, PhoneSchema, EssentialInfoSchema } from "@/lib/validation/profile.schema";
import { sendPhotoEmail } from "@/lib/photo-emails";
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

  await supabase.from("profiles").update({ onboarding_completed: true, onboarding_step: 3 }).eq("id", user.id);
  redirect("/feed");
}

export async function saveOnboardingStepAction(step: number) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  await supabase.from("profiles").update({ onboarding_step: step }).eq("id", user.id);
  // Sans ça, revenir sur /onboarding via un lien (ex: bandeau "Valider mon
  // profil") après être reparti au milieu de l'assistant pouvait servir une
  // page mise en cache reflétant un onboarding_step périmé, ramenant
  // toujours à la première étape au lieu de reprendre où la personne s'était arrêtée.
  revalidatePath("/onboarding");
  return { success: true };
}

export async function addProfilePhotoAction(url: string, storagePath: string, isPrimary: boolean) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  // Vérifié en amont (message précis) plutôt que de laisser la RLS
  // `profile_photos_insert_own` renvoyer une violation générique.
  const { data: viewerRow } = await supabase.from("profiles").select("first_name, is_staff, is_premium").eq("id", user.id).single();
  if (!viewerRow?.is_staff) {
    const { count } = await supabase.from("profile_photos").select("id", { count: "exact", head: true }).eq("profile_id", user.id);
    const limit = viewerRow?.is_premium ? 10 : 2;
    if ((count ?? 0) >= limit) {
      return {
        error: viewerRow?.is_premium
          ? `Limite de ${limit} photos atteinte.`
          : `Limite de ${limit} photos atteinte sur l'offre gratuite. Passe Premium pour en ajouter jusqu'à 10.`
      };
    }
  }

  if (isPrimary) {
    await supabase.from("profile_photos").update({ is_primary: false }).eq("profile_id", user.id);
  }

  // Chaque photo ajoutée démarre PENDING (colonne par défaut) — plateforme
  // chrétienne, aucune photo n'apparaît aux autres membres avant d'avoir été
  // revue par l'équipe. `profiles.avatar_url` (lu partout, y compris hors
  // RLS de profile_photos) ne doit donc JAMAIS être mis à jour ici, même si
  // `isPrimary` est demandé — seule `approvePhotoAction` peut le faire, une
  // fois la photo réellement validée.
  const { data, error } = await supabase
    .from("profile_photos")
    .insert({ profile_id: user.id, url, storage_path: storagePath, is_primary: isPrimary })
    .select()
    .single();

  if (error) return { error: error.message };

  if (user.email) {
    await sendPhotoEmail({ to: user.email, firstName: viewerRow?.first_name ?? "", kind: "SUBMITTED" });
  }

  revalidatePath("/profile");
  return { success: true, photo: data };
}

/**
 * Change la photo principale parmi des photos DÉJÀ existantes (contrairement
 * à `addProfilePhotoAction`, qui insère une nouvelle ligne — la réutiliser
 * ici aurait dupliqué la photo en base au lieu de simplement marquer la
 * ligne existante comme principale).
 */
export async function setPrimaryPhotoAction(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data: photo, error: fetchError } = await supabase
    .from("profile_photos")
    .select("url, moderation_status")
    .eq("id", photoId)
    .eq("profile_id", user.id)
    .single();
  if (fetchError || !photo) return { error: "Photo introuvable." };

  await supabase.from("profile_photos").update({ is_primary: false }).eq("profile_id", user.id);
  const { error } = await supabase.from("profile_photos").update({ is_primary: true }).eq("id", photoId);
  if (error) return { error: error.message };

  // `avatar_url` (visible par tout le monde, hors RLS de profile_photos) ne
  // doit jamais refléter une photo pas encore validée par l'équipe.
  if (photo.moderation_status === "APPROVED") {
    await supabase.from("profiles").update({ avatar_url: photo.url }).eq("id", user.id);
  }

  revalidatePath("/profile");
  revalidatePath("/discover");
  return { success: true };
}

export async function removeProfilePhotoAction(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data: photo } = await supabase
    .from("profile_photos")
    .select("storage_path, is_primary")
    .eq("id", photoId)
    .eq("profile_id", user.id)
    .single();
  if (!photo) return { error: "Photo introuvable." };

  await supabase.from("profile_photos").delete().eq("id", photoId).eq("profile_id", user.id);
  if (photo?.storage_path) {
    await supabase.storage.from("avatars").remove([photo.storage_path]);
  }

  // Si la photo supprimée était la photo principale : le profil ne doit
  // plus être visible dans Découvrir (filtre existant sur avatar_url non
  // nul), et si le profil était vérifié, ce statut ne veut plus rien dire
  // sans photo — on le repasse à UNVERIFIED (colonne protégée par trigger,
  // d'où le passage par le client admin, même schéma que la soumission).
  if (photo?.is_primary) {
    const admin = createAdminClient();
    await admin.from("profiles").update({ avatar_url: null, photo_verification_status: "UNVERIFIED" }).eq("id", user.id);
  }

  revalidatePath("/profile");
  revalidatePath("/discover");
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
