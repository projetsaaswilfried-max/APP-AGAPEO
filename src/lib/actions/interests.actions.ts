"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/supabase/session";
import { logAdminAction } from "@/lib/audit-log";
import { z } from "zod";

const InterestInputSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court.").max(40, "Nom trop long.")
});

/** Identifiant stable (slug) dérivé du nom au moment de la création — jamais recalculé ensuite (cf. InterestRow). */
function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "interet";
}

export async function createInterestAction(input: unknown) {
  const { user } = await requireAdminSession();
  const validated = InterestInputSchema.safeParse(input);
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Entrée invalide." };

  const admin = createAdminClient();
  const baseSlug = slugify(validated.data.name);

  // Collision de slug entre deux noms différents (rare, ex. accents/casse) —
  // jamais entre deux vrais doublons de nom, déjà rejetés par la contrainte
  // unique sur `name` avant d'atteindre cette boucle.
  for (let attempt = 0; attempt < 6; attempt++) {
    const id = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { error } = await admin.from("interests").insert({ id, name: validated.data.name });
    if (!error) {
      await logAdminAction(user.id, "CREATE_INTEREST", { targetType: "interest", targetId: id, details: { name: validated.data.name } });
      revalidatePath("/admin/interests");
      return { success: true };
    }
    if (error.code === "23505" && error.message.includes("interests_name_key")) {
      return { error: "Ce centre d'intérêt existe déjà." };
    }
    if (error.code !== "23505") return { error: error.message };
    // Collision sur l'id (slug) uniquement : on retente avec un suffixe.
  }
  return { error: "Impossible de générer un identifiant unique pour ce nom." };
}

export async function updateInterestAction(id: string, input: unknown) {
  const { user } = await requireAdminSession();
  const validated = InterestInputSchema.safeParse(input);
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Entrée invalide." };

  const admin = createAdminClient();
  const { error } = await admin.from("interests").update({ name: validated.data.name }).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "Ce centre d'intérêt existe déjà." };
    return { error: error.message };
  }

  await logAdminAction(user.id, "UPDATE_INTEREST", { targetType: "interest", targetId: id, details: { name: validated.data.name } });
  revalidatePath("/admin/interests");
  return { success: true };
}

export async function deleteInterestAction(id: string) {
  const { user } = await requireAdminSession();
  const admin = createAdminClient();
  const { error } = await admin.from("interests").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAdminAction(user.id, "DELETE_INTEREST", { targetType: "interest", targetId: id });
  revalidatePath("/admin/interests");
  return { success: true };
}
