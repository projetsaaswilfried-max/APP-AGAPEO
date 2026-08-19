import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description: "Politique de confidentialité d'Agapeo : comment tes données personnelles sont collectées, utilisées et protégées.",
  alternates: { canonical: "/politique-de-confidentialite" }
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white selection:bg-[#E83E75] selection:text-white">
      <LandingNavbar />
      
      <div className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl tracking-tight text-zinc-900 font-bricolage font-semibold mb-8">
            Politique de Confidentialité
          </h1>
          <p className="text-zinc-500 font-light mb-12">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>

          <div className="prose prose-zinc prose-a:text-[#E83E75] hover:prose-a:text-[#d42d62] font-light text-zinc-600 max-w-none">
            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">1. Introduction</h2>
            <p>
              Chez AGAPEO, nous savons que la confiance est le fondement de toute relation, qu&apos;il s&apos;agisse de celles que vous construisez sur notre plateforme ou de celle que vous entretenez avec nous. La présente Politique de Confidentialité vous explique comment nous collectons, utilisons, protégeons et partageons vos données personnelles.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">2. Données que nous collectons</h2>
            <p>Pour vous offrir une expérience de rencontre authentique, nous collectons certaines informations :</p>
            <ul className="list-disc pl-6 space-y-2 my-4">
              <li><strong>Données de profil :</strong> Prénom, âge, localisation, photos, préférences de rencontre.</li>
              <li><strong>Informations liées à la foi :</strong> Dénomination, implication dans l&apos;église, valeurs spirituelles (ces informations sont facultatives mais recommandées pour améliorer la compatibilité).</li>
              <li><strong>Données d&apos;utilisation :</strong> Interactions avec les autres profils (likes, messages), fréquence de connexion.</li>
              <li><strong>Données techniques :</strong> Adresse IP, type d&apos;appareil, système d&apos;exploitation.</li>
            </ul>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">3. Utilisation de vos données</h2>
            <p>Vos données sont principalement utilisées pour :</p>
            <ul className="list-disc pl-6 space-y-2 my-4">
              <li>Créer et gérer votre compte utilisateur.</li>
              <li>Vous proposer des profils compatibles (Match) en fonction de vos critères et de vos valeurs.</li>
              <li>Assurer la sécurité de la plateforme en détectant les faux profils et comportements malveillants.</li>
              <li>Vous envoyer des notifications essentielles concernant votre compte ou de nouveaux messages.</li>
            </ul>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">4. Partage des données</h2>
            <p>
              Les informations de votre profil (photos, prénom, âge, bio) sont visibles par les autres membres d&apos;AGAPEO. Nous ne vendons <strong>jamais</strong> vos données personnelles à des tiers à des fins commerciales. 
            </p>
            <p>
              Nous pouvons être amenés à partager certaines données techniques avec nos prestataires de confiance (hébergement sécurisé, service client) uniquement dans le but de faire fonctionner le service.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">5. Sécurité de vos informations</h2>
            <p>
              Nous mettons en place des mesures de sécurité techniques et organisationnelles (chiffrement, serveurs sécurisés) pour protéger vos données contre tout accès non autorisé, perte ou altération. Vos conversations privées sont strictement confidentielles.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">6. Vos droits (RGPD)</h2>
            <p>
              Conformément à la réglementation européenne, vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression et de portabilité de vos données. Vous pouvez supprimer définitivement votre compte et l&apos;intégralité de vos données directement depuis les paramètres de l&apos;application. Pour toute autre demande, contactez-nous via notre support.
            </p>
          </div>
        </div>
      </div>
      
      <LandingFooter />
    </main>
  );
}
