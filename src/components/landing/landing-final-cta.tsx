"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./scroll-reveal";
import { DecorativeBlob, ScatterDots } from "./signature-motif";

export function LandingFinalCta() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <ScrollReveal className="relative rounded-[2.5rem] bg-accent-subtle/60 border border-border/60 overflow-hidden px-6 py-16 sm:py-24 text-center">
          <DecorativeBlob className="-top-16 -left-20 w-80 h-80" />
          <ScatterDots className="top-6 right-6 w-28 h-28" />
          <div className="relative">
            <h2 className="font-landing text-3xl sm:text-5xl font-medium tracking-tight text-foreground leading-[1.05]">
              Votre prochaine rencontre pourrait commencer ici.
            </h2>
            <div className="mt-8">
              <Link href="/register">
                <Button size="lg">Créer mon profil</Button>
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">Bienvenue sur AGAPEO.</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
