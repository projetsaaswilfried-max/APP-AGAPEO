import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/supabase/session";
import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/core/providers/session-provider";
import { PremiumSuccessView } from "./premium-success-view";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

/**
 * Route déplacée depuis (dashboard) vers (auth) : (dashboard)/layout.tsx
 * appelle requireSession(), qui renverrait vers /payment-required un membre
 * dont le webhook Chariow n'a pas encore eu le temps d'arriver (cette page
 * existe justement pour attendre ce webhook via polling). getCurrentSession()
 * (sans le garde paiement) préserve le chrome habituel (nav, header) sans
 * jamais risquer ce rebond, pour les nouveaux payeurs comme pour les
 * abonnés existants qui renouvellent.
 */
export default async function PremiumSuccessPage() {
  const { user, profile } = await getCurrentSession();
  if (!user || !profile) redirect("/login");

  return (
    <SessionProvider user={user} profile={profile}>
      <AppShell>
        <PremiumSuccessView onboardingCompleted={profile.onboarding_completed} />
      </AppShell>
    </SessionProvider>
  );
}
