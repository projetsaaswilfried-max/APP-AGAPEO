import { SITE_CONFIG } from "@/config/site";
import { PREMIUM_PLANS } from "@/domain/premium-plans";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingDiscoverIntro } from "@/components/landing/landing-discover-intro";
import { LandingWhyAgapeo } from "@/components/landing/landing-why-agapeo";
import { LandingCompatibility } from "@/components/landing/landing-compatibility";
import { LandingProfileShowcase } from "@/components/landing/landing-profile-showcase";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingEmotional } from "@/components/landing/landing-emotional";
import { LandingSecurity } from "@/components/landing/landing-security";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingTestimonials } from "@/components/landing/landing-testimonials";
import { LandingVerse } from "@/components/landing/landing-verse";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFooter } from "@/components/landing/landing-footer";

const FAQ_STRUCTURED_DATA_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "AGAPEO est-il exclusivement réservé aux chrétiens ?",
    a: "Oui. AGAPEO a été pensé pour permettre aux célibataires chrétiens de rencontrer des personnes qui partagent leur foi et souhaitent construire une relation sérieuse."
  },
  {
    q: "Quelles confessions chrétiennes sont présentes ?",
    a: "AGAPEO peut accueillir différentes sensibilités chrétiennes. Chaque membre peut préciser sa confession, son parcours et ses préférences directement dans son profil."
  },
  {
    q: "AGAPEO est-il uniquement destiné au mariage ?",
    a: "AGAPEO est destiné aux personnes ouvertes à une relation sérieuse et engagée. Il ne s'agit pas de précipiter un mariage, mais de favoriser des rencontres avec des intentions claires."
  },
  {
    q: "Pourquoi renseigner des informations sur ma foi ?",
    a: "Parce que « chrétien » peut représenter des réalités différentes pour chacun. Ces informations permettent de mieux comprendre les convictions et la manière de vivre la foi de chaque personne."
  },
  {
    q: "Comment fonctionne la compatibilité ?",
    a: "AGAPEO tient compte de plusieurs dimensions : foi, valeurs, personnalité, vision du couple, projet familial, centres d'intérêt et préférences personnelles."
  },
  {
    q: "Est-ce gratuit ?",
    a: `L'accès complet à AGAPEO (Découvrir, messagerie, invitations...) nécessite un paiement unique de ${PREMIUM_PLANS.ACCESS.priceFcfaLabel}, valable 30 jours. Ton fil d'actualité (contenus et enseignements) reste toujours accessible.`
  },
  {
    q: "Comment AGAPEO protège-t-il sa communauté ?",
    a: "AGAPEO combine vérification, outils de confidentialité, signalement, blocage et modération afin de favoriser un environnement plus sain."
  }
];

// Données structurées (JSON-LD) : aide Google à comprendre l'entité (logo,
// nom) et permet aux réponses de la FAQ d'apparaître directement dans les
// résultats de recherche (rich snippets) — le contenu doit rester identique
// à celui affiché dans <LandingFaq />.
function LandingStructuredData() {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.name,
    legalName: SITE_CONFIG.fullName,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/images/agapeo-symbol.png`,
    description: SITE_CONFIG.description
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_STRUCTURED_DATA_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a }
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-white text-zinc-800 antialiased selection:bg-[#E83E75]/20 selection:text-[#E83E75] overflow-x-hidden">
      <LandingStructuredData />
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingDiscoverIntro />
        <LandingWhyAgapeo />
        <LandingCompatibility />
        <LandingProfileShowcase />
        <LandingHowItWorks />
        <LandingEmotional />
        <LandingSecurity />
        <LandingPricing />
        <LandingTestimonials />
        <LandingVerse />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  );
}
