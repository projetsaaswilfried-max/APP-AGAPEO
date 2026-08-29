import Link from "next/link";
import { Icon } from "@iconify/react";
import { PREMIUM_PLANS } from "@/domain/premium-plans";

const FREE_INCLUDED = [
  "Créer et compléter son profil",
  "Être visible dans Découvrir",
  "Recherche de base (âge, pays, statut)",
  "Consulter 10 profils par mois",
  "Recevoir des messages",
  "Vérification de profil sous 48h"
];

const FREE_EXCLUDED = [
  "Répondre aux messages / initier une conversation",
  "Mettre des profils en favori",
  "Voir qui s'intéresse à toi",
  "Filtres de recherche avancés",
  "Profil mis en avant dans Découvrir"
];

const PREMIUM_INCLUDED = [
  "Tout ce qui est inclus dans le plan Gratuit",
  "Consultation illimitée de profils",
  "Répondre aux messages et initier une conversation en premier",
  "Mettre des profils en favori",
  "Voir qui a consulté ou mis ton profil en favori",
  "Filtres de recherche avancés (ville, confession, engagement, profession, centres d'intérêt...)",
  "Profil mis en avant dans Découvrir",
  "Vérification de profil accélérée (moins de 24h)"
];

export function LandingPricing() {
  return (
    <section id="tarifs" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-light text-[#E83E75] tracking-widest uppercase mb-4 block">Rejoindre Agapeo</span>
          <h2 className="text-3xl md:text-5xl tracking-tight text-zinc-900 leading-tight mb-4 font-bricolage font-semibold">
            Commence ta recherche gratuitement.
          </h2>
          <p className="text-lg text-zinc-500 font-light">
            Crée ton profil, découvre la communauté et commence à rencontrer des célibataires chrétiens.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-zinc-50 rounded-[2.5rem] p-10 border border-zinc-200/60 flex flex-col">
            <div className="mb-8">
              <h3 className="text-2xl tracking-tight text-zinc-900 mb-2 font-bricolage font-semibold">Gratuit</h3>
              <p className="text-sm text-zinc-500 font-light">L&apos;essentiel pour commencer ta recherche.</p>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              {FREE_INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-700">
                  <Icon icon="hugeicons:tick-circle" className="text-[#E83E75] text-lg mt-0.5 shrink-0" width={18} height={18} />
                  <span>{item}</span>
                </li>
              ))}
              {FREE_EXCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-400">
                  <Icon icon="hugeicons:cancel-circle" className="text-zinc-300 text-lg mt-0.5 shrink-0" width={18} height={18} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div>
              <Link
                href="/register"
                className="block w-full py-4 text-center rounded-full border-2 border-zinc-200 text-zinc-900 font-normal hover:border-zinc-300 transition-colors"
              >
                Créer mon profil
              </Link>
              <span className="block text-xs text-zinc-500 mt-3 text-center">Inclus dans ton abonnement Premium.</span>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 border-2 border-[#E83E75] shadow-xl shadow-[#E83E75]/10 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#E83E75] text-white text-[10px] font-light uppercase tracking-widest px-4 py-1.5 rounded-bl-xl">
              Recommandé
            </div>
            <div className="mb-8">
              <h3 className="text-2xl tracking-tight text-[#E83E75] mb-2 flex items-center gap-1.5 font-bricolage font-semibold">
                Premium
                <Icon icon="hugeicons:crown" className="text-xl" width={20} height={20} />
              </h3>
              <div className="flex items-baseline gap-1.5 mb-4 flex-wrap">
                <span className="text-3xl tracking-tight text-zinc-900 font-bricolage font-light">{PREMIUM_PLANS.MONTHLY.priceFcfaLabel}</span>
                <span className="text-sm text-zinc-500">/ mois</span>
              </div>
              <p className="text-sm text-zinc-500 font-light">renouvelable à tout moment.</p>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              {PREMIUM_INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-900">
                  <Icon icon="hugeicons:tick-circle" className="text-[#E83E75] text-lg mt-0.5 shrink-0" width={18} height={18} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div>
              <Link
                href="/register"
                className="block w-full py-4 text-center rounded-full bg-[#E83E75] text-white font-normal hover:bg-[#d42d62] transition-colors shadow-md shadow-[#E83E75]/30"
              >
                Découvrir AGAPEO+
              </Link>
              <span className="block text-xs text-zinc-500 mt-3 text-center">Merci pour ta confiance — profite de tous tes avantages Premium.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
