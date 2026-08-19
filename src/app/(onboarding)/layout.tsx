import type { Metadata } from "next";
import { SessionProvider } from "@/core/providers/session-provider";
import { requireSession } from "@/lib/supabase/session";

// Parcours d'inscription du compte : jamais indexé.
export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

/**
 * Volontairement PAS de redirection quand `onboarding_completed` est déjà
 * vrai : un membre doit toujours pouvoir revenir ici corriger un champ
 * manquant (ex: vision du mariage) — avant, une fois l'onboarding terminé,
 * cette page devenait inaccessible pour toujours, sans aucun autre endroit
 * dans l'app pour éditer ces champs. `(dashboard)/layout.tsx` reste
 * responsable de forcer les nouveaux membres à passer par ici une première fois.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireSession();

  return (
    <SessionProvider user={user} profile={profile}>
      <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </SessionProvider>
  );
}
