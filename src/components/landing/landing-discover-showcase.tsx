"use client";

import { BadgeCheckIcon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { ScrollReveal } from "./scroll-reveal";

const PROFILES = [
  { initial: "M", name: "Marc", age: 31, city: "Lomé", profession: "Ingénieur", compatibility: 88 },
  { initial: "S", name: "Sarah", age: 27, city: "Abidjan", profession: "Médecin", compatibility: 94 },
  { initial: "D", name: "David", age: 33, city: "Douala", profession: "Entrepreneur", compatibility: 82 }
];

export function LandingDiscoverShowcase() {
  return (
    <section id="decouvrir" className="py-20 sm:py-28 bg-accent-subtle/40">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <ScrollReveal className="text-center max-w-xl mx-auto mb-14">
          <span className="text-sm font-medium text-primary">Découvrir</span>
          <h2 className="mt-2 font-landing text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            Des profils choisis, pas juste défilés
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Chaque profil affiche l&apos;essentiel — valeurs, compatibilité, vérification — pour une découverte
            posée, sans swipe.
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-3 gap-4">
          {PROFILES.map((profile, i) => (
            <ScrollReveal key={profile.name} delay={i * 0.1}>
              <div className="p-5 rounded-3xl bg-card border border-border/60 shadow-2xs hover:shadow-soft hover:-translate-y-1 transition-all duration-300 space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent-subtle flex items-center justify-center text-white text-xl font-landing mx-auto">
                  {profile.initial}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">
                      {profile.name}, {profile.age} ans
                    </span>
                    <HugeIcon icon={BadgeCheckIcon} size={13} className="text-primary shrink-0" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {profile.city} · {profile.profession}
                  </span>
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent-subtle">
                  <span className="text-xs font-bold text-primary">{profile.compatibility}% compatible</span>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
