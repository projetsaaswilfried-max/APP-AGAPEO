"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdminSession } from "@/lib/supabase/session";
import { logAdminAction } from "@/lib/audit-log";
import type { PaymentProvider } from "@/domain/payment-provider";

/** Lu par tout membre connecté (RLS ouverte en lecture) — utilisé par startPremiumCheckoutAction pour savoir quel processeur utiliser. */
export async function getActivePaymentProviderAction(): Promise<PaymentProvider> {
  const supabase = await createClient();
  const { data } = await supabase.from("payment_settings").select("active_provider").eq("id", true).maybeSingle();
  return (data?.active_provider as PaymentProvider | undefined) ?? "chariow";
}

/** Bascule l'agrégateur actif — réservé SUPER_ADMIN, vérifié ici en plus de la RLS (defense in depth) sur une opération qui affecte l'argent réel. */
export async function setActivePaymentProviderAction(provider: PaymentProvider) {
  const { user } = await requireSuperAdminSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("payment_settings")
    .update({ active_provider: provider, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", true);

  if (error) return { error: error.message };

  await logAdminAction(user.id, "SWITCH_PAYMENT_PROVIDER", { targetType: "payment_settings", details: { provider } });
  revalidatePath("/admin/payments");
  return { success: true };
}
