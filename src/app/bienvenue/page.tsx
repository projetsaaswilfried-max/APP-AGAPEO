import type { Metadata } from "next";
import Link from "next/link";
import { AgapeoLogo } from "@/components/ui/logo";
import { SITE_CONFIG } from "@/config/site";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Bienvenue",
  description: SITE_CONFIG.description,
  alternates: { canonical: "/bienvenue" }
};

/**
 * Point d'entrée de l'appli Android (TWA) — cf. `start_url` dans manifest.ts.
 * Sans cet écran, l'appli ouvrait directement la page d'accueil marketing du
 * site (pensée pour le web), au lieu d'un vrai premier écran d'appli.
 */
export default function BienvenuePage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between p-8 pb-10 bg-gradient-to-br from-[#FF8FC7] via-[#FE70B2] to-[#DE4A97] text-center select-none">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-sm">
        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl p-4">
          <AgapeoLogo size="lg" iconOnly />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-display font-bold tracking-tight text-white">Bienvenue sur Agapeo</h1>
          <p className="text-sm text-white/90 leading-relaxed">
            L&apos;alliance chrétienne pour le mariage — rencontre des célibataires qui partagent ta foi et ton engagement pour un mariage bâti sur
            des valeurs communes.
          </p>
        </div>
      </div>

      <Link
        href="/login"
        className="w-full max-w-sm flex items-center justify-center gap-2 h-14 rounded-full bg-white text-[#DE4A97] font-semibold text-sm shadow-2xl hover:opacity-95 transition-opacity"
      >
        Suivant <ArrowRight size={18} />
      </Link>
    </div>
  );
}
