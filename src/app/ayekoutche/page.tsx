import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/supabase/session";
import { AdminLoginForm } from "@/components/features/admin/admin-login-form";
import { AgapeoLogo } from "@/components/ui/logo";

// Jamais indexée — cf. src/app/robots.ts (disallow "/ayekoutche") et le
// disallow de préfixe qui couvre déjà toutes les sous-pages de l'espace
// équipe ; ce tag reste une deuxième barrière pour cette page précise, qui
// vit hors du groupe (admin) et n'hérite donc pas de son metadata robots.
export const metadata: Metadata = {
  title: "Espace Équipe — Agapeo",
  robots: { index: false, follow: false }
};

const STAFF_ROLES = new Set(["MODERATOR", "ADMIN", "SUPER_ADMIN"]);

export default async function AdminLoginPage() {
  const { profile } = await getCurrentSession();
  if (profile && STAFF_ROLES.has(profile.role)) {
    redirect("/ayekoutche/overview");
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg p-3">
            <AgapeoLogo size="md" iconOnly />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-display font-semibold tracking-tight text-white">Espace Équipe Agapeo</h1>
            <p className="text-xs text-neutral-400">Accès réservé au personnel autorisé.</p>
          </div>
        </div>

        <AdminLoginForm />

        <p className="text-center text-[11px] text-neutral-600">Cette page n&apos;est pas destinée aux membres de la plateforme.</p>
      </div>
    </div>
  );
}
