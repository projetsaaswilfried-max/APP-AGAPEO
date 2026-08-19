import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation et de Vente",
  description: "Conditions générales d'utilisation et de vente d'Agapeo, la plateforme de rencontre pour célibataires chrétiens.",
  alternates: { canonical: "/cgv" }
};

export default function CGVPage() {
  return (
    <main className="min-h-screen bg-white selection:bg-[#E83E75] selection:text-white">
      <LandingNavbar />
      
      <div className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl tracking-tight text-zinc-900 font-bricolage font-semibold mb-8">
            Conditions Générales d&apos;Utilisation et de Vente
          </h1>
          <p className="text-zinc-500 font-light mb-12">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>

          <div className="prose prose-zinc prose-a:text-[#E83E75] hover:prose-a:text-[#d42d62] font-light text-zinc-600 max-w-none">
            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">1. Objet et acceptation des conditions</h2>
            <p>
              Les présentes Conditions Générales d&apos;Utilisation et de Vente (ci-après les &quot;CGU/CGV&quot;) ont pour objet de définir les conditions dans lesquelles AGAPEO met à disposition de ses utilisateurs sa plateforme de rencontre chrétienne. L&apos;inscription et l&apos;utilisation de nos services impliquent l&apos;acceptation sans réserve des présentes conditions.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">2. Accès au service et éligibilité</h2>
            <p>
              Pour utiliser AGAPEO, vous devez être âgé d&apos;au moins 18 ans et être célibataire, divorcé(e) ou veuf/veuve. L&apos;application est destinée aux personnes partageant les valeurs chrétiennes et cherchant à construire une relation sérieuse axée sur la foi. Nous nous réservons le droit de supprimer tout profil ne respectant pas ces critères fondamentaux.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">3. Engagements de l&apos;utilisateur</h2>
            <p>En créant un compte sur AGAPEO, vous vous engagez à :</p>
            <ul className="list-disc pl-6 space-y-2 my-4">
              <li>Fournir des informations exactes, sincères et à jour sur votre identité et votre foi.</li>
              <li>Ne pas publier de contenu offensant, discriminatoire, à caractère sexuel, ou contraire aux valeurs chrétiennes.</li>
              <li>Faire preuve de respect, de bienveillance et de courtoisie envers les autres membres de la communauté.</li>
              <li>Ne pas utiliser l&apos;application à des fins commerciales, de prosélytisme abusif ou de sollicitation financière.</li>
            </ul>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">4. Abonnements et Services Payants (AGAPEO+)</h2>
            <p>
              L&apos;inscription et l&apos;utilisation de base d&apos;AGAPEO sont gratuites. Toutefois, nous proposons des fonctionnalités premium via notre abonnement &quot;AGAPEO+&quot;.
            </p>
            <p>
              <strong>Prix et renouvellement :</strong> Les tarifs en vigueur sont indiqués sur l&apos;application avant toute souscription. Sauf résiliation de votre part effectuée avant la fin de la période en cours, votre abonnement se renouvellera automatiquement pour une durée identique.
            </p>
            <p>
              <strong>Droit de rétractation :</strong> Conformément à la législation européenne, vous disposez d&apos;un délai de 14 jours pour exercer votre droit de rétractation après la souscription d&apos;un abonnement payant, à condition de ne pas avoir commencé à utiliser les fonctionnalités premium (ex: envoyer un message).
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">5. Modération et suspension de compte</h2>
            <p>
              AGAPEO se réserve le droit de modérer les profils et les photos. En cas de non-respect des présentes CGU/CGV, d&apos;un comportement inapproprié signalé par d&apos;autres membres, ou de la création d&apos;un faux profil, nous nous réservons le droit de suspendre ou de supprimer définitivement votre compte, sans préavis ni remboursement.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">6. Responsabilité</h2>
            <p>
              AGAPEO met tout en œuvre pour vérifier les profils et garantir un environnement sûr. Cependant, nous ne pouvons être tenus responsables des actions, déclarations ou comportements des utilisateurs, que ce soit en ligne ou lors de rencontres physiques. Nous vous encourageons à faire preuve de discernement et de prudence lors de vos rencontres.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">7. Modification des conditions</h2>
            <p>
              Nous pouvons mettre à jour ces CGU/CGV à tout moment. Toute modification vous sera notifiée via l&apos;application ou par email. En continuant d&apos;utiliser nos services après ces modifications, vous acceptez les nouvelles conditions.
            </p>
          </div>
        </div>
      </div>
      
      <LandingFooter />
    </main>
  );
}
