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

export default function LandingPage() {
  return (
    <div className="bg-white text-zinc-800 antialiased selection:bg-[#E83E75]/20 selection:text-[#E83E75] overflow-x-hidden">
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
