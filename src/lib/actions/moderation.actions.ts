"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ReportSchema } from "@/lib/validation/profile.schema";

export async function submitReportAction(input: { targetType: "PROFILE" | "MESSAGE" | "POST"; targetId: string; reason: string; details?: string }) {
  const parsed = ReportSchema.safeParse(input);
  if (!parsed.success) return { error: "Signalement invalide." };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null
  });

  if (error) return { error: "Le signalement n'a pas pu être envoyé." };
  return { success: true };
}

export async function blockUserAction(blockedId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: blockedId });
  if (error) return { error: "Le blocage a échoué." };

  revalidatePath("/discover");
  revalidatePath("/messages");
  return { success: true };
}

export async function unblockUserAction(blockedId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", blockedId);
  return { success: true };
}
