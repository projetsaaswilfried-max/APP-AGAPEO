"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LoginSchema,
  RegisterSchema,
  RequestPasswordResetSchema,
  UpdatePasswordSchema,
  ChangeEmailSchema
} from "@/lib/validation/auth.schema";
import { env } from "@/config/env";

export type FormState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function signUpAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const validated = RegisterSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms")
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { firstName, lastName, email, password } = validated.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: `${env.siteUrl}/auth/confirm`
    }
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered") || error.code === "user_already_exists") {
      return { errors: { email: ["Un compte existe déjà avec cette adresse e-mail."] } };
    }
    return { message: error.message };
  }

  if (data.session) {
    redirect("/onboarding");
  }

  return { message: "CHECK_EMAIL" };
}

export async function signInAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validated.data);

  if (error) {
    if (error.code === "email_not_confirmed" || error.message.toLowerCase().includes("email not confirmed")) {
      return { message: "EMAIL_NOT_CONFIRMED" };
    }
    if (error.code === "invalid_credentials") {
      return { message: "Adresse e-mail ou mot de passe incorrect." };
    }
    return { message: error.message };
  }

  const redirectTo = formData.get("redirectTo");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function resendConfirmationAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email) {
    return { message: "Adresse e-mail manquante." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${env.siteUrl}/auth/confirm` }
  });

  if (error) return { message: error.message };
  return { message: "CONFIRMATION_RESENT" };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const validated = RequestPasswordResetSchema.safeParse({ email: formData.get("email") });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/reset-password`
  });

  // Réponse identique que l'e-mail existe ou non : évite de révéler quels emails sont inscrits.
  return { message: "RESET_EMAIL_SENT" };
}

export async function updatePasswordAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const validated = UpdatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: validated.data.password });

  if (error) {
    return { message: "Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré." };
  }

  redirect("/login?passwordUpdated=1");
}

/**
 * Changement de mot de passe depuis l'espace compte (utilisateur déjà
 * connecté) : on revérifie l'ancien mot de passe via `signInWithPassword`
 * avant d'appeler `updateUser`, Supabase Auth ne l'exigeant pas nativement.
 */
export async function changePasswordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const currentPassword = formData.get("currentPassword");
  const validated = UpdatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> };
  }
  if (typeof currentPassword !== "string" || !currentPassword) {
    return { errors: { currentPassword: ["Mot de passe actuel requis."] } };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.email) return { message: "Session expirée, reconnecte-toi." };

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verifyError) {
    return { errors: { currentPassword: ["Mot de passe actuel incorrect."] } };
  }

  const { error } = await supabase.auth.updateUser({ password: validated.data.password });
  if (error) return { message: error.message };

  return { message: "PASSWORD_UPDATED" };
}

/**
 * Changement d'adresse email : revérifie le mot de passe actuel (même
 * logique que `changePasswordAction`), puis déclenche le flux de
 * confirmation natif de Supabase Auth — l'adresse ne change réellement
 * qu'après clic sur le lien de confirmation envoyé à la NOUVELLE adresse
 * (et, selon la config Supabase, un second lien à l'ancienne adresse).
 * Rien n'est mis à jour en base tant que ce n'est pas confirmé.
 */
export async function changeEmailAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const currentPassword = formData.get("currentPassword");
  const validated = ChangeEmailSchema.safeParse({ newEmail: formData.get("newEmail") });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> };
  }
  if (typeof currentPassword !== "string" || !currentPassword) {
    return { errors: { currentPassword: ["Mot de passe actuel requis."] } };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.email) return { message: "Session expirée, reconnecte-toi." };

  if (validated.data.newEmail.toLowerCase() === user.email.toLowerCase()) {
    return { errors: { newEmail: ["C'est déjà ton adresse actuelle."] } };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verifyError) {
    return { errors: { currentPassword: ["Mot de passe actuel incorrect."] } };
  }

  const { error } = await supabase.auth.updateUser(
    { email: validated.data.newEmail },
    { emailRedirectTo: `${env.siteUrl}/auth/confirm` }
  );
  if (error) return { message: error.message };

  return { message: "EMAIL_CHANGE_REQUESTED" };
}
