import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminSession } from "@/lib/supabase/session";
import { AdminPaymentSettings } from "@/components/features/admin/admin-payment-settings";
import type { PaymentProvider } from "@/domain/payment-provider";

export default async function AdminPaymentsPage() {
  await requireSuperAdminSession();
  const admin = createAdminClient();

  const { data } = await admin.from("payment_settings").select("active_provider, updated_at").eq("id", true).maybeSingle();
  const activeProvider: PaymentProvider = (data?.active_provider as PaymentProvider | undefined) ?? "chariow";

  return <AdminPaymentSettings initialProvider={activeProvider} updatedAt={data?.updated_at ?? null} />;
}
