"use client";

import { QuoteUpIcon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { ScrollReveal } from "./scroll-reveal";

const TESTIMONIALS = [
  { initial: "N", name: "Naomi", role: "Membre depuis 2025", quote: "J'ai enfin pu échanger avec des personnes qui partagent vraiment ma foi et ma vision du mariage." },
  { initial: "J", name: "Josué", role: "Membre depuis 2025", quote: "Les enseignements m'ont aidé à mieux me comprendre avant même de rencontrer quelqu'un." },
  { initial: "R", name: "Ruth", role: "Membre depuis 2026", quote: "Une plateforme sérieuse, sans pression — exactement ce que je cherchais." }
];

export function LandingTestimonials() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <ScrollReveal className="text-center max-w-xl mx-auto mb-14">
          <span className="text-sm font-medium text-primary">Ce qu&apos;ils en disent</span>
          <h2 className="mt-2 font-landing text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            Des rencontres qui ont du sens
          </h2>
        </ScrollReveal>

        <div className="grid sm:grid-cols-3 gap-4">
          {TESTIMONIALS.map((testimonial, i) => (
            <ScrollReveal key={testimonial.name} delay={i * 0.1} className="p-6 rounded-3xl bg-card border border-border/60 space-y-4">
              <HugeIcon icon={QuoteUpIcon} size={20} className="text-primary/40" />
              <p className="text-sm text-foreground/80 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
              <div className="flex items-center gap-2.5 pt-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent-subtle flex items-center justify-center text-white text-xs font-landing shrink-0">
                  {testimonial.initial}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-[10px] text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
