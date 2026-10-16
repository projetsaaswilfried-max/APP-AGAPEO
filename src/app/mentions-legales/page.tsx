import type { Metadata } from "next";
import { HOME_ROOT_CLASS } from "@/components/home/fonts";
import Navbar from "@/components/home/sections/Navbar";
import Footer from "@/components/home/sections/Footer";

export const metadata: Metadata = {
  title: "Mentions Légales",
  description: "Mentions légales d'Agapeo, plateforme sociale destinée aux célibataires chrétiens.",
  alternates: { canonical: "/mentions-legales" }
};

export default function LegalMentionsPage() {
  return (
    <main className={`${HOME_ROOT_CLASS} min-h-screen bg-white overflow-x-clip`}>
      <Navbar onHome={false} />
      
      <div className="pt-10 pb-24 sm:pt-14">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl tracking-tight text-zinc-900 font-urbanist font-medium mb-8">
            Mentions Légales
          </h1>
          <p className="text-zinc-500 font-light mb-12">
            Conformément aux dispositions de la loi pour la confiance dans l&apos;économie numérique.
          </p>

          <div className="prose prose-zinc prose-a:text-[#E83E75] hover:prose-a:text-[#d42d62] font-light text-zinc-600 max-w-none">
            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">1. Éditeur de l&apos;application</h2>
            <p>
              L&apos;application <strong>AGAPEO</strong> est éditée par la société GETSITE LTD.<br />
              Forme juridique : Private limited Company<br />
              Siège social : 128 City Road, London, United Kingdom, EC1V 2NX<br />
              Immatriculation : Companies House (Royaume-Uni) sous le numéro 16732343<br />
              Email : contact@agapeo.com
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">2. Directeur de la publication</h2>
            <p>
              Le Directeur de la publication est M. Ayekoutche Wilfried ADJALLA, en qualité de Directeur de GETSITE LTD.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">3. Hébergement</h2>
            <p>
              La plateforme AGAPEO est hébergée sur les serveurs de :<br />
              Vercel Inc.<br />
              340 S Lemon Ave #4133<br />
              Walnut, CA 91789, USA<br />
              Contact : privacy@vercel.com
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">4. Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu de l&apos;application AGAPEO (textes, images, logos, interfaces, code source) est la propriété exclusive de AGAPEO SAS et est protégé par les lois relatives à la propriété intellectuelle. Toute reproduction, représentation, modification ou adaptation, totale ou partielle, est strictement interdite sans notre accord préalable écrit.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">5. Données personnelles</h2>
            <p>
              Pour toute question relative à la gestion de vos données personnelles et à l&apos;exercice de vos droits (accès, rectification, suppression), veuillez consulter notre <a href="/politique-de-confidentialite">Politique de Confidentialité</a> ou nous contacter à dpo@agapeo.com.
            </p>
          </div>
        </div>
      </div>
      
      <Footer onHome={false} />
    </main>
  );
}
