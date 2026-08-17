"use client";

import { Shield01Icon, Flag01Icon, UserBlock01Icon, SquareLock01Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { ScrollReveal } from "./scroll-reveal";

const POINTS = [
  { icon: Shield01Icon, label: "Profils vérifiés", description: "Email, téléphone et photo vérifiés avant de rejoindre la communauté." },
  { icon: Flag01Icon, label: "Signalement", description: "Un comportement inapproprié se signale en un instant." },
  { icon: UserBlock01Icon, label: "Blocage", description: "Vous gardez le contrôle de qui peut vous contacter." },
  { icon: SquareLock01Icon, label: "Confidentialité", description: "Vous choisissez ce qui est visible, et par qui." }
];

export function LandingTrustSecurity() {
  return (
    <section id="securite" className="py-20 sm:py-28 bg-accent-subtle/40">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <ScrollReveal className="text-center max-w-xl mx-auto mb-14">
          <span className="text-sm font-medium text-primary">Confiance & sécurité</span>
          <h2 className="mt-2 font-landing text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            Un espace pensé pour être sûr
          </h2>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {POINTS.map((point, i) => (
            <ScrollReveal key={point.label} delay={i * 0.08} className="p-6 rounded-3xl bg-card border border-border/60 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent-subtle text-primary mx-auto mb-3.5">
                <HugeIcon icon={point.icon} size={18} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{point.label}</h3>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">{point.description}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
