import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingServices } from "@/components/landing/landing-services";
import { LandingDiscoverShowcase } from "@/components/landing/landing-discover-showcase";
import { LandingStats } from "@/components/landing/landing-stats";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingTeachings } from "@/components/landing/landing-teachings";
import { LandingTrustSecurity } from "@/components/landing/landing-trust-security";
import { LandingTestimonials } from "@/components/landing/landing-testimonials";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFinalCta } from "@/components/landing/landing-final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingServices />
        <LandingDiscoverShowcase />
        <LandingStats />
        <LandingHowItWorks />
        <LandingTeachings />
        <LandingTrustSecurity />
        <LandingTestimonials />
        <LandingFaq />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
