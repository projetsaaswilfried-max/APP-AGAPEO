"use client";

import { Search01Icon, Brain02Icon, BubbleChatIcon, Home09Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { ScrollReveal } from "./scroll-reveal";

const STEPS = [
  { icon: Search01Icon, label: "Découvrir", description: "Des profils choisis pour leur compatibilité, pas leur apparence." },
  { icon: Brain02Icon, label: "Comprendre", description: "Sa foi, ses valeurs, sa vision du mariage — avant tout le reste." },
  { icon: BubbleChatIcon, label: "Échanger", description: "Une conversation qui prend le temps de vraiment se connaître." },
  { icon: Home09Icon, label: "Construire", description: "Une relation orientée vers un projet de vie commun." }
];

export function LandingServices() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <ScrollReveal className="text-center max-w-xl mx-auto mb-14">
          <span className="text-sm font-medium text-primary">Notre approche</span>
          <h2 className="mt-2 font-landing text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            Une autre façon d&apos;aborder la rencontre
          </h2>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <ScrollReveal key={step.label} delay={i * 0.08} className="text-center p-6 rounded-3xl bg-card border border-border/60 shadow-2xs">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-subtle text-primary mx-auto mb-4">
                <HugeIcon icon={step.icon} size={22} />
              </div>
              <h3 className="font-landing text-base font-medium text-foreground">{step.label}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{step.description}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
