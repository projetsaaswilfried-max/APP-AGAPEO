"use client";

import { ScrollReveal } from "./scroll-reveal";

const STEPS = [
  { number: "01", title: "Créez votre profil", description: "Foi, valeurs, personnalité et vision du mariage." },
  { number: "02", title: "Définissez ce que vous recherchez", description: "Des critères clairs pour de bonnes recommandations." },
  { number: "03", title: "Découvrez des profils compatibles", description: "Une sélection basée sur ce qui compte vraiment." },
  { number: "04", title: "Commencez une conversation", description: "À votre rythme, sans pression." }
];

export function LandingHowItWorks() {
  return (
    <section id="comment-ca-marche" className="py-20 sm:py-28 bg-accent-subtle/30">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <ScrollReveal className="text-center max-w-xl mx-auto mb-16">
          <span className="text-sm font-medium text-primary">Comment ça marche</span>
          <h2 className="mt-2 font-landing text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            Quatre étapes, un vrai départ
          </h2>
        </ScrollReveal>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 sm:left-1/2 top-4 bottom-4 w-px bg-border/80 -translate-x-1/2" />
          
          <div className="space-y-12">
            {STEPS.map((step, i) => (
              <ScrollReveal key={step.number} delay={i * 0.1} className="relative flex flex-col sm:flex-row items-start sm:items-center gap-8">
                {/* Timeline Number Circle */}
                <div className={`absolute left-8 sm:left-1/2 top-0 -translate-x-1/2 flex items-center justify-center w-12 h-12 rounded-full bg-card border-2 border-primary/20 text-primary font-landing text-lg font-medium shadow-sm z-10`}>
                  {step.number}
                </div>
                
                <div className={`w-full pl-20 sm:pl-0 sm:w-1/2 ${i % 2 === 0 ? "sm:pr-16 sm:text-right" : "sm:pl-16 sm:order-last"}`}>
                  <div className="p-6 rounded-3xl bg-card border border-border/40 hover:border-primary/20 transition-colors shadow-sm">
                    <h3 className="text-base font-semibold text-foreground leading-snug">{step.title}</h3>
                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
                
                {/* Empty space for alternating layout */}
                <div className="hidden sm:block sm:w-1/2" />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
