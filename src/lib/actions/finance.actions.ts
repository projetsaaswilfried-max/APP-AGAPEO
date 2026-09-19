"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminSession } from "@/lib/supabase/session";
import { logAdminAction } from "@/lib/audit-log";
import { z } from "zod";

const ExpenseInputSchema = z.object({
  label: z.string().trim().min(2, "Libellé trop court."),
  category: z.string().trim().min(1, "Catégorie requise."),
  amountCents: z.number().int().positive("Le montant doit être positif."),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  note: z.string().trim().max(500).optional()
});

export async function createExpenseAction(input: unknown) {
  const { user } = await requireSuperAdminSession();
  const validated = ExpenseInputSchema.safeParse(input);
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Entrée invalide." };

  const admin = createAdminClient();
  const { error } = await admin.from("expenses").insert({
    label: validated.data.label,
    category: validated.data.category,
    amount_cents: validated.data.amountCents,
    currency: "USD",
    expense_date: validated.data.expenseDate,
    note: validated.data.note || null,
    created_by: user.id
  });
  if (error) return { error: error.message };

  await logAdminAction(user.id, "CREATE_EXPENSE", { targetType: "expense", details: { label: validated.data.label, amountCents: validated.data.amountCents } });
  revalidatePath("/admin/finances");
  return { success: true };
}

export async function updateExpenseAction(expenseId: string, input: unknown) {
  const { user } = await requireSuperAdminSession();
  const validated = ExpenseInputSchema.safeParse(input);
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Entrée invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("expenses")
    .update({
      label: validated.data.label,
      category: validated.data.category,
      amount_cents: validated.data.amountCents,
      expense_date: validated.data.expenseDate,
      note: validated.data.note || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", expenseId);
  if (error) return { error: error.message };

  await logAdminAction(user.id, "UPDATE_EXPENSE", { targetType: "expense", targetId: expenseId });
  revalidatePath("/admin/finances");
  return { success: true };
}

export async function deleteExpenseAction(expenseId: string) {
  const { user } = await requireSuperAdminSession();
  const admin = createAdminClient();
  const { error } = await admin.from("expenses").delete().eq("id", expenseId);
  if (error) return { error: error.message };

  await logAdminAction(user.id, "DELETE_EXPENSE", { targetType: "expense", targetId: expenseId });
  revalidatePath("/admin/finances");
  return { success: true };
}

const PlatformDeductionInputSchema = z
  .object({
    provider: z.string().trim().min(1, "Plateforme requise."),
    amountCents: z.number().int().positive("Le montant doit être positif."),
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de début invalide."),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de fin invalide."),
    note: z.string().trim().max(500).optional()
  })
  .refine((data) => data.periodEnd >= data.periodStart, { message: "La fin de période doit être après son début.", path: ["periodEnd"] });

// Jamais calculé automatiquement : Chariow/SasPay ne communiquent leur
// pourcentage prélevé par aucune API/webhook, seulement constaté sur le
// relevé réel au moment du retrait — cf. migration platform_deductions.
export async function createPlatformDeductionAction(input: unknown) {
  const { user } = await requireSuperAdminSession();
  const validated = PlatformDeductionInputSchema.safeParse(input);
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Entrée invalide." };

  const admin = createAdminClient();
  const { error } = await admin.from("platform_deductions").insert({
    provider: validated.data.provider,
    amount_cents: validated.data.amountCents,
    currency: "USD",
    period_start: validated.data.periodStart,
    period_end: validated.data.periodEnd,
    note: validated.data.note || null,
    created_by: user.id
  });
  if (error) return { error: error.message };

  await logAdminAction(user.id, "CREATE_PLATFORM_DEDUCTION", { targetType: "platform_deduction", details: { provider: validated.data.provider, amountCents: validated.data.amountCents } });
  revalidatePath("/admin/finances");
  return { success: true };
}

export async function updatePlatformDeductionAction(deductionId: string, input: unknown) {
  const { user } = await requireSuperAdminSession();
  const validated = PlatformDeductionInputSchema.safeParse(input);
  if (!validated.success) return { error: validated.error.issues[0]?.message ?? "Entrée invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_deductions")
    .update({
      provider: validated.data.provider,
      amount_cents: validated.data.amountCents,
      period_start: validated.data.periodStart,
      period_end: validated.data.periodEnd,
      note: validated.data.note || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", deductionId);
  if (error) return { error: error.message };

  await logAdminAction(user.id, "UPDATE_PLATFORM_DEDUCTION", { targetType: "platform_deduction", targetId: deductionId });
  revalidatePath("/admin/finances");
  return { success: true };
}

export async function deletePlatformDeductionAction(deductionId: string) {
  const { user } = await requireSuperAdminSession();
  const admin = createAdminClient();
  const { error } = await admin.from("platform_deductions").delete().eq("id", deductionId);
  if (error) return { error: error.message };

  await logAdminAction(user.id, "DELETE_PLATFORM_DEDUCTION", { targetType: "platform_deduction", targetId: deductionId });
  revalidatePath("/admin/finances");
  return { success: true };
}
