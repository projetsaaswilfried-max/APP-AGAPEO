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
    expense_date: validated.data.expenseDate,
    note: validated.data.note || null,
    created_by: user.id
  });
  if (error) return { error: error.message };

  await logAdminAction(user.id, "CREATE_EXPENSE", { targetType: "expense", details: { label: validated.data.label, amountCents: validated.data.amountCents } });
  revalidatePath("/ayekoutche/finances");
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
  revalidatePath("/ayekoutche/finances");
  return { success: true };
}

export async function deleteExpenseAction(expenseId: string) {
  const { user } = await requireSuperAdminSession();
  const admin = createAdminClient();
  const { error } = await admin.from("expenses").delete().eq("id", expenseId);
  if (error) return { error: error.message };

  await logAdminAction(user.id, "DELETE_EXPENSE", { targetType: "expense", targetId: expenseId });
  revalidatePath("/ayekoutche/finances");
  return { success: true };
}
