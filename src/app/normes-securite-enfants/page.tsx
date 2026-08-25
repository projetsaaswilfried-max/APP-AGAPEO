import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Normes de sécurité des enfants",
  description: "L'engagement d'Agapeo contre l'exploitation et les abus sexuels sur mineurs, et les mesures mises en place pour protéger la communauté.",
  alternates: { canonical: "/normes-securite-enfants" }
};

export default function ChildSafetyStandardsPage() {
  return (
    <main className="min-h-screen bg-white selection:bg-[#E83E75] selection:text-white">
      <LandingNavbar />

      <div className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl tracking-tight text-zinc-900 font-bricolage font-semibold mb-8">
            Normes de sécurité des enfants
          </h1>
          <p className="text-zinc-500 font-light mb-12">
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>

          <div className="prose prose-zinc prose-a:text-[#E83E75] hover:prose-a:text-[#d42d62] font-light text-zinc-600 max-w-none">
            <h2 className="text-2xl font-medium text-zinc-900 mt-0 mb-6">1. Une plateforme réservée aux adultes</h2>
            <p>
              Agapeo est exclusivement destinée aux personnes majeures (18 ans et plus) engagées dans une recherche sérieuse de mariage.
              L&apos;âge est demandé et vérifié dès l&apos;inscription, et chaque profil fait ensuite l&apos;objet d&apos;une vérification d&apos;identité
              manuelle (selfie en direct comparé aux photos publiées) par notre équipe avant de devenir visible par les autres membres.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">2. Tolérance zéro</h2>
            <p>
              Agapeo applique une politique de <strong>tolérance zéro</strong> envers toute forme d&apos;exploitation ou d&apos;abus sexuel sur mineur
              (CSAE — Child Sexual Abuse and Exploitation), sous quelque forme que ce soit : contenu, sollicitation, mise en relation ou
              comportement. Tout compte impliqué est immédiatement suspendu et signalé aux autorités compétentes.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">3. Nos mesures de prévention</h2>
            <ul>
              <li>Vérification de l&apos;âge (date de naissance) obligatoire à l&apos;inscription — l&apos;accès est refusé en dessous de 18 ans.</li>
              <li>Vérification d&apos;identité manuelle par selfie en direct, comparée aux photos du profil, avant toute visibilité publique.</li>
              <li>Chaque photo ajoutée à un profil est examinée individuellement par notre équipe avant d&apos;apparaître à quiconque.</li>
              <li>Signalement et blocage disponibles sur chaque profil, message et publication.</li>
              <li>Une équipe de modération examine chaque signalement et peut suspendre ou supprimer un compte à tout moment.</li>
            </ul>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">4. Comment signaler un problème</h2>
            <p>
              Si tu es témoin ou tu soupçonnes un contenu ou un comportement lié à l&apos;exploitation ou à l&apos;abus sexuel d&apos;un mineur, utilise
              le bouton de signalement directement sur le profil, le message ou la publication concernée. Tu peux aussi nous écrire
              directement à{" "}
              <a href="mailto:support@agapeo.love">support@agapeo.love</a>. Chaque signalement est examiné en priorité par notre équipe.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">5. Coopération avec les autorités</h2>
            <p>
              Agapeo coopère pleinement avec les forces de l&apos;ordre et les autorités compétentes dans le cadre de toute enquête liée à la
              protection des mineurs, et respecte l&apos;ensemble des lois applicables en la matière.
            </p>

            <h2 className="text-2xl font-medium text-zinc-900 mt-12 mb-6">6. Contact</h2>
            <p>
              Pour toute question relative à ces normes ou à leur mise en œuvre, contacte-nous à{" "}
              <a href="mailto:support@agapeo.love">support@agapeo.love</a>.
            </p>
          </div>
        </div>
      </div>

      <LandingFooter />
    </main>
  );
}
