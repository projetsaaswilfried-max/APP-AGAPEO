import type { Metadata } from "next";
import { HOME_ROOT_CLASS } from "@/components/home/fonts";
import Navbar from "@/components/home/sections/Navbar";
import Footer from "@/components/home/sections/Footer";
import { CalendlyBookingWidget } from "@/components/features/support/calendly-booking-widget";

export const metadata: Metadata = {
  title: "Réserver un appel",
  description: "Un souci avec ton abonnement, ton compte ou ta soumission de profil sur Agapeo ? Réserve un appel avec notre équipe, au créneau qui t'arrange.",
  alternates: { canonical: "/reserver-un-appel" },
  robots: { index: false, follow: false }
};

// Page publique volontairement HORS de (dashboard) : les liens envoyés par
// email doivent amener directement au calendrier, sans obliger la personne
// à se connecter d'abord (le souci qui l'amène ici peut justement être
// qu'elle n'arrive plus à se connecter ou à soumettre son profil).
export default function BookCallPage() {
  return (
    <main className={`${HOME_ROOT_CLASS} min-h-screen bg-white overflow-x-clip`}>
      <Navbar onHome={false} />

      <div className="pt-10 pb-24 sm:pt-14">
        <div className="max-w-2xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl tracking-tight text-zinc-900 font-urbanist font-medium mb-3">Réserve un appel avec notre équipe</h1>
          <p className="text-zinc-500 font-light mb-8">
            Un souci avec ton abonnement, ton compte, ta soumission de profil... quel que soit le problème rencontré sur Agapeo, choisis un créneau qui
            t&apos;arrange et on le règle ensemble, en direct.
          </p>
          <CalendlyBookingWidget />
        </div>
      </div>

      <Footer />
    </main>
  );
}
