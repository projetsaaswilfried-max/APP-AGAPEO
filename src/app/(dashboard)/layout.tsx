import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/core/providers/session-provider";
import { requireSession } from "@/lib/supabase/session";

// Espace membre connecté : jamais indexé (contenu privé, profils, messages).
export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

/**
 * Volontairement PAS de redirection forcée vers /onboarding : un membre qui
 * vient de s'inscrire accède directement à son interface (Accueil), avec un
 * bandeau l'invitant à valider son profil — cf. OnboardingProgressBanner sur
 * /feed. Tant que le profil n'est pas complet, il reste de toute façon
 * invisible dans Découvrir (cf. discover.service.ts) et les interactions
 * restent bloquées par le gating de vérification existant.
 */
export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireSession();

  return (
    <SessionProvider user={user} profile={profile}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
