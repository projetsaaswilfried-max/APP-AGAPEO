"use client";

import { PlayIcon, Note01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { ScrollReveal } from "./scroll-reveal";

const CONTENTS = [
  { type: "video", category: "Mariage", title: "Les fondations d'un mariage solide" },
  { type: "article", category: "Relations", title: "Comment reconnaître une relation saine ?" },
  { type: "video", category: "Foi & Couple", title: "Foi, amour et engagement" }
] as const;

export function LandingTeachings() {
  return (
    <section id="enseignements" className="py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <ScrollReveal className="text-center max-w-xl mx-auto mb-14">
          <span className="text-sm font-medium text-primary">Apprendre avant de construire</span>
          <h2 className="mt-2 font-landing text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            Rencontrer, c&apos;est bien. Comprendre, c&apos;est mieux.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Une bibliothèque d&apos;enseignements sur les relations, le mariage et la vie à deux, publiée par
            l&apos;équipe AGAPEO.
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-3 gap-4">
          {CONTENTS.map((content, i) => (
            <ScrollReveal key={content.title} delay={i * 0.08} className="group">
              <div className="rounded-3xl bg-card border border-border/60 overflow-hidden hover:shadow-soft hover:-translate-y-1 transition-all duration-300">
                <div className="relative aspect-[4/3] flex items-center justify-center bg-accent-subtle">
                  <div className="flex items-center justify-center w-11 h-11 rounded-full bg-card shadow-2xs group-hover:scale-105 transition-transform">
                    {content.type === "video" ? (
                      <HugeIcon icon={PlayIcon} size={16} className="text-primary ml-0.5" strokeWidth={2.2} />
                    ) : (
                      <HugeIcon icon={Note01Icon} size={16} className="text-primary" />
                    )}
                  </div>
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-card/90 text-[10px] font-semibold text-foreground">
                    {content.category}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-foreground leading-snug">{content.title}</h3>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.25} className="flex justify-center mt-8">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Et bien d&apos;autres à découvrir <HugeIcon icon={ArrowRight01Icon} size={15} />
          </span>
        </ScrollReveal>
      </div>
    </section>
  );
}
