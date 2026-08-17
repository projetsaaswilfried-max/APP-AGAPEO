"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";
import { DecorativeBlob } from "./signature-motif";

const STATS = [
  { value: "100%", label: "Profils vérifiés" },
  { value: "10+", label: "Critères de compatibilité" }
];

const FACTORS = [
  { label: "Foi & valeurs", percent: 95 },
  { label: "Vision du mariage", percent: 88 },
  { label: "Personnalité", percent: 82 },
  { label: "Projets de vie", percent: 76 }
];

function ProgressBar({ label, percent, delay }: { label: string; percent: number; delay: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs font-semibold text-primary">{percent}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${percent}%` }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: reduceMotion ? 0.01 : 0.9, delay: reduceMotion ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-primary"
        />
      </div>
    </div>
  );
}

export function LandingStats() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <DecorativeBlob className="w-72 h-72 -left-24 top-1/2 -translate-y-1/2 opacity-60" />

      <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <ScrollReveal>
            <span className="text-sm font-medium text-primary">Pourquoi ça marche</span>
            <h2 className="mt-2 font-landing text-3xl sm:text-4xl font-medium tracking-tight text-foreground leading-tight">
              Une compatibilité pensée sur ce qui compte
            </h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md">
              Pas un algorithme froid — une manière de mettre en lumière vos valeurs, votre foi et votre vision du
              mariage avant tout le reste.
            </p>

            <div className="mt-8 flex gap-8">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <span className="font-landing text-3xl font-medium text-primary">{stat.value}</span>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15} className="p-7 sm:p-8 rounded-3xl bg-card border border-border/60 shadow-soft space-y-5">
            {FACTORS.map((factor, i) => (
              <ProgressBar key={factor.label} label={factor.label} percent={factor.percent} delay={i * 0.1} />
            ))}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
