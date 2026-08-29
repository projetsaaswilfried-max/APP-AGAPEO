"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileEditablePartialSchema, PhoneSchema, EssentialInfoSchema } from "@/lib/validation/profile.schema";
import { sendPhotoEmail } from "@/lib/photo-emails";
import type { ProfileUpdate, ProfilePhotoRow } from "@/lib/supabase/database.types";

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
 * `gender`/`birth_date`/`country` ne sont plus collectés à l'inscription
 * (allège le tout premier écran) — cette étape d'onboarding les pose une
 * bonne fois pour toutes, que le compte vienne de Google (qui ne les
 * transmet jamais) ou d'une inscription email classique. Volontairement
 * absents de `ProfileEditableSchema` (posés une fois, non modifiables
 * ensuite) — cette action ne fait rien si l'un d'eux est déjà renseigné,
 * pour ne jamais devenir une porte dérobée de modification.
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

/**
 * Étape dédiée "Selfie" de l'onboarding (juste après les photos) : capture le
 * selfie de vérification tôt dans le parcours plutôt qu'à la toute fin, pour
 * ne pas l'empiler avec le champ "pourquoi le mariage" au moment où la
 * motivation est la plus fragile. Consommé et vidé par
 * `submitVerificationRequestAction` au moment de la soumission réelle.
 */
export async function savePendingSelfieAction(selfieStoragePath: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { error } = await supabase.from("profiles").update({ pending_selfie_storage_path: selfieStoragePath }).eq("id", user.id);
  if (error) return { error: error.message };

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
  const { data: viewerRow } = await supabase
    .from("profiles")
    .select("first_name, is_staff, is_premium, photo_verification_status")
    .eq("id", user.id)
    .single();
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
  // chrétienne, aucune photo n'apparaît aux AUTRES membres avant d'avoir été
  // revue par l'équipe.
  const { data, error } = await supabase
    .from("profile_photos")
    .insert({ profile_id: user.id, url, storage_path: storagePath, is_primary: isPrimary })
    .select()
    .single();

  if (error) return { error: error.message };

  // Avant toute première vérification, personne d'autre ne peut voir ce
  // profil (Découvrir et la fiche publique exigent VERIFIED) — refléter tout
  // de suite la photo choisie dans `avatar_url` ne l'expose donc à personne,
  // et évite de bloquer la première soumission pour vérification derrière
  // une modération qui n'a pas encore eu lieu (isProfileComplete() exige
  // avatar_url). Une fois déjà VERIFIED, un changement de photo doit en
  // revanche repasser par `approvePhotoAction` avant de remplacer ce que
  // voient les autres membres.
  if (isPrimary && viewerRow?.photo_verification_status !== "VERIFIED") {
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  }

  if (user.email) {
    await sendPhotoEmail({ to: user.email, firstName: viewerRow?.first_name ?? "", kind: "SUBMITTED" });
  }

  revalidatePath("/profile");
  return { success: true, photo: data };
}

/**
 * Ajout d'une ou plusieurs photos APRÈS une première vérification déjà
 * validée (contrairement à `addProfilePhotoAction`, utilisée pendant
 * l'onboarding avant toute vérification, une photo à la fois, sans selfie).
 * Ici, un seul selfie en direct couvre tout le lot sélectionné en une fois —
 * l'appelant (PhotoManager) le fait prendre juste avant d'appeler cette
 * action, une fois tous les fichiers choisis. Insertions séquentielles (pas
 * un insert() multi-lignes) : `profile_photos_insert_own` vérifie le quota
 * via `count_profile_photos()`, qui ne verrait pas les lignes du même lot si
 * elles arrivaient dans un seul statement (même transaction = même snapshot).
 */
export async function addVerifiedProfilePhotosAction(photos: { url: string; storagePath: string }[], selfieStoragePath: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };
  if (photos.length === 0) return { error: "Aucune photo à envoyer." };
  if (!selfieStoragePath) return { error: "Un selfie de vérification est requis pour ajouter une nouvelle photo." };

  const { data: viewerRow } = await supabase
    .from("profiles")
    .select("first_name, is_staff, is_premium, photo_verification_status")
    .eq("id", user.id)
    .single();

  if (!viewerRow?.is_staff) {
    if (viewerRow?.photo_verification_status !== "VERIFIED") {
      return { error: "Cette action est réservée à un profil déjà vérifié." };
    }

    const { count: pendingCount } = await supabase
      .from("profile_photos")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("moderation_status", "PENDING");
    if ((pendingCount ?? 0) > 0) {
      return { error: "Ta photo précédente est encore en cours d'examen par notre équipe — attends sa validation avant d'en ajouter une nouvelle." };
    }

    const { count: totalCount } = await supabase.from("profile_photos").select("id", { count: "exact", head: true }).eq("profile_id", user.id);
    const limit = viewerRow?.is_premium ? 10 : 2;
    if ((totalCount ?? 0) + photos.length > limit) {
      return { error: `Limite de ${limit} photos atteinte — impossible d'ajouter ${photos.length} photo(s) de plus.` };
    }
  }

  const inserted: ProfilePhotoRow[] = [];
  for (const photo of photos) {
    const { data, error } = await supabase
      .from("profile_photos")
      .insert({ profile_id: user.id, url: photo.url, storage_path: photo.storagePath, is_primary: false, selfie_storage_path: selfieStoragePath })
      .select()
      .single();
    if (error) return { error: error.message, photos: inserted };
    if (data) inserted.push(data as ProfilePhotoRow);
  }

  if (user.email) {
    await sendPhotoEmail({ to: user.email, firstName: viewerRow?.first_name ?? "", kind: "SUBMITTED" });
  }

  revalidatePath("/profile");
  return { success: true, photos: inserted };
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

  const { data: viewerRow } = await supabase.from("profiles").select("photo_verification_status").eq("id", user.id).single();

  await supabase.from("profile_photos").update({ is_primary: false }).eq("profile_id", user.id);
  const { error } = await supabase.from("profile_photos").update({ is_primary: true }).eq("id", photoId);
  if (error) return { error: error.message };

  // `avatar_url` (visible par tout le monde, hors RLS de profile_photos) ne
  // doit jamais refléter une photo pas encore validée par l'équipe UNE FOIS
  // déjà vérifié — mais avant cette première vérification, personne d'autre
  // ne peut de toute façon voir ce profil (même règle que addProfilePhotoAction).
  if (photo.moderation_status === "APPROVED" || viewerRow?.photo_verification_status !== "VERIFIED") {
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
