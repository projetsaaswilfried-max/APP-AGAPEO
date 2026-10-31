import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/supabase/session";
import { SessionFreshnessWatcher } from "@/core/providers/session-freshness-watcher";
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
    redirect(profile.onboarding_completed ? "/accueil" : "/onboarding");
  }

  // Le paiement se règle sur la page hébergée du prestataire : au retour sur
  // cet onglet resté ouvert, rien ne re-rendait cette page côté serveur et le
  // membre restait bloqué sur « Achat d'accès obligatoire » alors qu'il venait
  // de payer. Le veilleur détecte l'activation et re-rend la page, qui le
  // redirige alors d'elle-même (garde ci-dessus).
  return (
    <>
      <SessionFreshnessWatcher
        userId={user.id}
        subscriptionStatus={profile.subscription_status}
        photoVerificationStatus={profile.photo_verification_status}
      />
      <PaymentRequiredView />
    </>
  );
}
