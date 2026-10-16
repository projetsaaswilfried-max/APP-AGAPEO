import { SITE_CONFIG } from "@/config/site";
import { HOME_ROOT_CLASS } from "@/components/home/fonts";
import { FAQ } from "@/components/home/faq-data";
import SmoothScroll from "@/components/home/lib/SmoothScroll";
import Navbar from "@/components/home/sections/Navbar";
import Hero from "@/components/home/sections/Hero";
import Video from "@/components/home/sections/Video";
import Singles from "@/components/home/sections/Singles";
import Welcome from "@/components/home/sections/Welcome";
import Vision from "@/components/home/sections/Vision";
import Compatibility from "@/components/home/sections/Compatibility";
import ProfileDetails from "@/components/home/sections/ProfileDetails";
import Steps from "@/components/home/sections/Steps";
import Prayer from "@/components/home/sections/Prayer";
import Safety from "@/components/home/sections/Safety";
import Pricing from "@/components/home/sections/Pricing";
import Testimonials from "@/components/home/sections/Testimonials";
import FinalCta from "@/components/home/sections/FinalCta";
import Faq from "@/components/home/sections/Faq";
import Footer from "@/components/home/sections/Footer";

// Données structurées (JSON-LD) : aide Google à comprendre l'entité (logo,
// nom) et permet aux réponses de la FAQ d'apparaître directement dans les
// résultats de recherche (rich snippets) — FAQ vient du même module que la
// section <Faq />, le contenu reste donc identique à celui affiché.
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
    mainEntity: FAQ.map((item) => ({
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

// Landing publique — portée depuis le projet Vite "AGAPEO 🩷/SITE" (cf. src/components/home/home.css).
export default function LandingPage() {
  return (
    <div className={`${HOME_ROOT_CLASS} bg-paper overflow-x-clip`}>
      <LandingStructuredData />
      <SmoothScroll />
      <Navbar />
      <main>
        <Hero />
        <Video />
        <Singles id="celibataires" />
        <Welcome />
        <Vision />
        <Compatibility />
        <ProfileDetails />
        <Steps />
        <Prayer />
        <Safety />
        <Pricing />
        <Testimonials />
        <FinalCta />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
