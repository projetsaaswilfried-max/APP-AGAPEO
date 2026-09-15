"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginSchema } from "@/lib/validation/auth.schema";

export type AdminAuthState = { message?: string } | undefined;

const STAFF_ROLES = new Set(["MODERATOR", "ADMIN", "SUPER_ADMIN"]);

// Message volontairement identique dans tous les cas d'échec (mauvais
// email/mot de passe OU compte valide mais sans rôle staff) : ne jamais
// laisser deviner, depuis cette page, qu'un email correspond à un compte
// réel mais non habilité — même principe que la réinitialisation de mot de
// passe côté membre (message générique quel que soit le cas réel).
const GENERIC_ERROR = "Identifiants invalides.";

export async function adminSignInAction(_prevState: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!validated.success) {
    return { message: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(validated.data);

  if (error || !data.user) {
    return { message: GENERIC_ERROR };
  }

  const { data: restricted } = await supabase.from("profile_restricted").select("role").eq("id", data.user.id).single();

  if (!restricted || !STAFF_ROLES.has(restricted.role)) {
    await supabase.auth.signOut();
    return { message: GENERIC_ERROR };
  }

  redirect("/ayekoutche/overview");
}
