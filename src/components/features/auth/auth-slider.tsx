"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { AgapeoSymbol } from "@/components/ui/logo";
import { ShieldCheck, HeartHandshake, CheckCircle2, Award } from "lucide-react";

interface SlideData {
  id: number;
  image: string;
  badge: string;
  title: string;
  description: string;
  cardTitle: string;
  cardMetric: string;
  cardDetail: string;
}

const SLIDES: SlideData[] = [
  {
    id: 1,
    image: "/images/auth/slide_couple_wedding.png",
    badge: "Alliance & Engagement",
    title: "Un Espace Privilégié pour des Mariages Bâtis sur la Foi",
    description: "Agapeo vous accompagne dans une recherche sélective et bienveillante pour concrétiser un projet de mariage fondé sur des valeurs partagées.",
    cardTitle: "Profils Certifiés & Éthiques",
    cardMetric: "98% d'affinité",
    cardDetail: "Foi commune • Projet Mariage • Valeurs"
  },
  {
    id: 2,
    image: "/images/auth/slide_couple_cafe.png",
    badge: "Rencontres Sincères",
    title: "Des Échanges Profonds et une Communauté Saine",
    description: "Échangez dans un cadre sécurisé et respectueux avec des personnes qui partagent votre vision du couple et votre engagement spirituel.",
    cardTitle: "Vœux & Objectifs de Vie",
    cardMetric: "100% Sincérité",
    cardDetail: "Modération continue • Profils vérifiés"
  },
  {
    id: 3,
    image: "/images/auth/slide_faith_commitment.png",
    badge: "Sérénité & Confiance",
    title: "Une Démarche Sérénissime pour Trouver l'Âme Sœur",
    description: "Une expérience fluide et haut de gamme, pensée pour préserver votre vie privée et favoriser des connexions durables.",
    cardTitle: "Matchs par Affinité",
    cardMetric: "+10,000 Témoignages",
    cardDetail: "Recherche guidée par les valeurs"
  }
];

export function AuthSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(timer);
  }, [isHovered, nextSlide]);

  const currentSlide = SLIDES[currentIndex];

  return (
    <div
      className="relative w-full h-full min-h-[580px] lg:min-h-[700px] flex flex-col justify-between p-8 lg:p-12 rounded-[2.25rem] bg-[#0E131B] text-white overflow-hidden shadow-2xl border border-white/10 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Image Carousel with Overlay */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-0"
        >
          <Image
            src={currentSlide.image}
            alt={currentSlide.title}
            fill
            className="object-cover object-center opacity-40 mix-blend-luminosity brightness-90 filter"
            priority
          />
          {/* Subtle Grid overlay like reference image */}
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]"
            aria-hidden="true"
          />
          {/* Multi-layered dark gradient shading for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E131B] via-[#0E131B]/75 to-[#0E131B]/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E131B]/80 via-transparent to-[#0E131B]/80" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Floating 3D/Glassmorphism Cards Showcase (Top Section) */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center pt-4 lg:pt-6">
        <div className="relative w-full max-w-sm h-64 sm:h-72 flex items-center justify-center">
          
          {/* Card 1: Top Floating Card (Matching reference image overlay style) */}
          <motion.div
            key={`card-top-${currentIndex}`}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="absolute top-0 w-64 sm:w-72 p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl z-20 hover:scale-[1.02] transition-transform duration-300"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium tracking-wide uppercase text-pink-200/90 flex items-center gap-1.5">
                <HeartHandshake size={12} className="text-primary" /> {currentSlide.badge}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#1877F2]/20 text-[#60A5FA] font-semibold border border-[#1877F2]/40 shadow-xs backdrop-blur-md flex items-center gap-1">
                <CheckCircle2 size={11} className="text-[#38BDF8] fill-[#1877F2]/30" /> Vérifié
              </span>
            </div>
            <p className="text-xs font-semibold text-white/90">{currentSlide.cardTitle}</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold tracking-tight text-white">{currentSlide.cardMetric}</span>
              <span className="text-[10px] text-pink-300/80 font-medium">Top Match</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70">
              <span>{currentSlide.cardDetail}</span>
            </div>
          </motion.div>

          {/* Card 2: Stacked Background Card 1 */}
          <motion.div
            key={`card-bg1-${currentIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.85, y: 35, scale: 0.92 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute w-60 sm:w-68 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-xl z-10 pointer-events-none"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-white/70 font-medium">Recherche personnalisée</span>
              <Award size={13} className="text-amber-400" />
            </div>
            <p className="text-xs font-semibold text-white/90">Mariage & Engagements</p>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-pink-400 h-full w-[85%] rounded-full" />
            </div>
          </motion.div>

          {/* Card 3: Stacked Background Card 2 */}
          <motion.div
            key={`card-bg2-${currentIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.5, y: 68, scale: 0.84 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="absolute w-56 sm:w-64 p-3.5 rounded-2xl bg-white/5 backdrop-blur-xs border border-white/5 shadow-md z-0 pointer-events-none"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/60">Agapeo Security</span>
              <ShieldCheck size={12} className="text-[#38BDF8]" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Center Brand Icon Badge with Official Monogram */}
      <div className="relative z-10 my-4 flex justify-center">
        <motion.div
          whileHover={{ scale: 1.08, rotate: 3 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="w-14 h-14 sm:w-16 sm:h-16 p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-xl shadow-primary/20 cursor-pointer"
        >
          <AgapeoSymbol className="w-full h-full" />
        </motion.div>
      </div>

      {/* Main Slide Content & Text (Bottom Section) */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-3 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="space-y-2.5"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight font-display">
              {currentSlide.title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300/90 leading-relaxed max-w-md mx-auto">
              {currentSlide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Segmented Slide Progress Controls (Matching reference image's bottom bars) */}
      <div className="relative z-10 pt-6 flex items-center justify-center gap-2">
        {SLIDES.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={slide.id}
              onClick={() => setCurrentIndex(idx)}
              className="group relative h-2.5 py-1 flex items-center cursor-pointer transition-all duration-300 focus:outline-none"
              aria-label={`Go to slide ${idx + 1}`}
            >
              <div
                className={`h-1.5 rounded-full transition-all duration-500 overflow-hidden ${
                  isActive ? "w-12 bg-white/20" : "w-6 bg-white/20 hover:bg-white/40"
                }`}
              >
                {isActive && (
                  <motion.div
                    key={`progress-${currentIndex}`}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 6, ease: "linear" }}
                    className="h-full bg-gradient-to-r from-primary to-pink-300 rounded-full"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
