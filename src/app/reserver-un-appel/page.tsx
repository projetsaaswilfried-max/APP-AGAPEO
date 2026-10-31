import type { Metadata } from "next";
import { HOME_ROOT_CLASS } from "@/components/home/fonts";
import Navbar from "@/components/home/sections/Navbar";
import Footer from "@/components/home/sections/Footer";
import { buildSupportWhatsAppUrl, SUPPORT_WHATSAPP_DISPLAY } from "@/config/support";

export const metadata: Metadata = {
  title: "Besoin d'aide",
  description: "Un souci avec ton abonnement, ton compte ou ta soumission de profil sur Agapeo ? Écris-nous directement sur WhatsApp.",
  alternates: { canonical: "/reserver-un-appel" },
  robots: { index: false, follow: false }
};

/**
 * L'URL reste /reserver-un-appel alors que la réservation d'appel a été
 * retirée : plus de 20 000 emails déjà envoyés pointent ici, ils doivent
 * continuer d'amener quelque part d'utile plutôt que sur une 404. Le contenu,
 * lui, renvoie désormais vers WhatsApp. Page publique (hors espace connecté) :
 * quelqu'un qui n'arrive plus à se connecter doit pouvoir nous joindre.
 */
export default function SupportLandingPage() {
  const whatsappUrl = buildSupportWhatsAppUrl("GENERAL");

  return (
    <main className={`${HOME_ROOT_CLASS} min-h-screen bg-white overflow-x-clip`}>
      <Navbar onHome={false} />

      <div className="pt-16 pb-28 sm:pt-20">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-4xl tracking-tight text-zinc-900 font-urbanist font-medium mb-4">Besoin d&apos;aide ?</h1>
          <p className="text-zinc-500 font-light mb-10 leading-relaxed">
            Abonnement, paiement, vérification de profil, compte bloqué... quel que soit le problème rencontré sur Agapeo, écris-nous directement
            sur WhatsApp : on lit ton message et on règle ça avec toi.
          </p>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 h-12 px-8 rounded-full bg-[#25D366] text-white text-base font-medium hover:opacity-90 transition-opacity"
          >
            Écrire sur WhatsApp
          </a>

          <p className="text-sm text-zinc-400 font-light mt-5">{SUPPORT_WHATSAPP_DISPLAY}</p>
        </div>
      </div>

      <Footer />
    </main>
  );
}
