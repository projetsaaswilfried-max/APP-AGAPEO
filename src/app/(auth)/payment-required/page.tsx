import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/supabase/session";
import { PaymentRequiredView } from "./payment-required-view";

export const metadata: Metadata = {
  title: "Achat d'accès à Agapeo obligatoire",
  robots: { index: false, follow: false }
};

/**
 * Sortie automatique si la personne a déjà payé (webhook arrivé entre-temps)
 * ou n'est pas concernée par ce paywall (compte existant, jamais un nouveau
 * compte payment_required) — jamais de blocage permanent même si cette page
 * est mise en favori ou revisitée après coup.
 */
export default async function PaymentRequiredPage() {
  const { user, profile } = await getCurrentSession();

  if (!user || !profile) redirect("/login");
  if (!profile.payment_required || profile.subscription_status === "ACTIVE") {
    redirect(profile.onboarding_completed ? "/feed" : "/onboarding");
  }

  return <PaymentRequiredView />;
}
