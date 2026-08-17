"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheckIcon, FavouriteIcon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { Button } from "@/components/ui/button";
import { AgapeoSymbol } from "@/components/ui/logo";
import { TRANSITION_EASE } from "@/core/animations/variants";
import { DecorativeBlob, ScatterDots } from "./signature-motif";

const COMMON_VALUES = ["Foi chrétienne", "Projet familial", "Sincérité"];

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Colonne texte */}
          <div className="text-center lg:text-left">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: TRANSITION_EASE }}
              className="text-sm font-medium text-primary mb-3"
            >
              Bienvenue sur AGAPEO
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: TRANSITION_EASE }}
              className="font-landing text-4xl sm:text-5xl lg:text-[3.4rem] font-medium tracking-tight text-foreground leading-[1.1]"
            >
              La bonne rencontre commence par les <span className="text-primary">bonnes valeurs</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: TRANSITION_EASE }}
              className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0"
            >
              AGAPEO aide les célibataires chrétiens à découvrir des personnes qui partagent leur foi et leur vision du
              mariage, et à mieux comprendre les relations en chemin.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22, ease: TRANSITION_EASE }}
              className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start"
            >
              <Link href="/register" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  Créer mon profil
                </Button>
              </Link>
              <a href="#comment-ca-marche" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Comment ça marche
                </Button>
              </a>
            </motion.div>
          </div>

          {/* Colonne visuelle — Image optimisée avec badges */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: TRANSITION_EASE }}
            className="relative mx-auto w-full max-w-sm lg:max-w-md aspect-[4/5] sm:aspect-square"
          >
            <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-sm border border-border/40">
              <img
                src="/images/hero-image.jpg"
                alt="Jeune femme rayonnante utilisant AGAPEO"
                className="w-full h-full object-cover object-center"
              />
              {/* Overlay léger pour l'intégration douce */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: TRANSITION_EASE }}
              className="absolute -top-4 -right-2 sm:-right-4 flex flex-col items-center justify-center w-20 h-20 rounded-full bg-card border border-border/40 shadow-sm"
            >
              <span className="font-landing text-xl font-semibold text-primary leading-none">91%</span>
              <span className="text-[9px] font-medium text-muted-foreground mt-1 text-center leading-tight">compatibilité</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: TRANSITION_EASE }}
              className="absolute bottom-4 -left-4 sm:left-0 flex items-center gap-2 bg-card border border-border/40 rounded-2xl shadow-sm px-3.5 py-2.5"
            >
              <HugeIcon icon={FavouriteIcon} size={14} className="text-primary shrink-0" />
              <span className="text-[11px] font-medium text-foreground/80">5 valeurs en commun</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7, ease: TRANSITION_EASE }}
              className="absolute top-1/3 -right-6 hidden sm:flex items-center gap-1.5 bg-card border border-border/40 rounded-full shadow-sm px-3 py-1.5"
            >
              <HugeIcon icon={BadgeCheckIcon} size={13} className="text-primary" />
              <span className="text-[10px] font-medium text-foreground/80">Vérifié</span>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-2"
        >
          {COMMON_VALUES.map((value) => (
            <span key={value} className="px-3.5 py-1.5 rounded-full bg-card border border-border/60 text-xs font-medium text-foreground/80">
              {value}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
