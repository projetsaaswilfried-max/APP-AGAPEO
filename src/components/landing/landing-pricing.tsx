import Link from "next/link";
import { Icon } from "@iconify/react";
import { PREMIUM_PLANS } from "@/domain/premium-plans";

const ACCESS_INCLUDED = [
  "Créer et compléter son profil",
  "Être visible dans Découvrir",
  "Consultation illimitée de profils",
  "Envoyer et recevoir des messages sans limite",
  "Envoyer des invitations",
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
            Un accès complet pour ta recherche.
          </h2>
          <p className="text-lg text-zinc-500 font-light">
            Une inscription simple, un accès complet à toute la plateforme pour rencontrer des personnes dans le cadre
            de ton choix de partenaire.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-[2.5rem] p-10 border-2 border-[#E83E75] shadow-xl shadow-[#E83E75]/10 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#E83E75] text-white text-[10px] font-light uppercase tracking-widest px-4 py-1.5 rounded-bl-xl">
              Accès complet
            </div>
            <div className="mb-8">
              <h3 className="text-2xl tracking-tight text-[#E83E75] mb-2 flex items-center gap-1.5 font-bricolage font-semibold">
                Agapeo
                <Icon icon="hugeicons:crown" className="text-xl" width={20} height={20} />
              </h3>
              <div className="flex items-baseline gap-1.5 mb-4 flex-wrap">
                <span className="text-3xl tracking-tight text-zinc-900 font-bricolage font-light">{PREMIUM_PLANS.ACCESS.priceFcfaLabel}</span>
                <span className="text-sm text-zinc-500">/ 30 jours</span>
              </div>
              <p className="text-sm text-zinc-500 font-light">Renouvelable à tout moment — paiement 100% sécurisé.</p>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              {ACCESS_INCLUDED.map((item) => (
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
                Créer mon compte
              </Link>
              <span className="block text-xs text-zinc-500 mt-3 text-center">
                Ton fil d&apos;actualité (contenus et enseignements) reste toujours accessible, même sans accès actif.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
