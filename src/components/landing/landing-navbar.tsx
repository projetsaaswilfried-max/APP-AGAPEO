"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { SITE_CONFIG } from "@/config/site";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "#decouvrir", label: "Découvrir AGAPEO" },
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#telecharger", label: "App" }
];

export function LandingNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-zinc-100/60 shadow-xs">
      {/* Bandeau discret annonçant la disponibilité sur Google Play — l'appli
          vient d'être validée, pas encore présente sur l'App Store. */}
      <a
        href={SITE_CONFIG.apps.playStoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 py-2 px-4 bg-zinc-900 text-white text-[11px] sm:text-xs font-light hover:bg-zinc-800 transition-colors"
      >
        <Icon icon="mdi:google-play" width={14} height={14} className="text-[#FE72B2] shrink-0" />
        <span className="hidden sm:inline">AGAPEO est disponible sur Google Play —</span>
        <span className="font-medium underline underline-offset-2">Télécharger maintenant</span>
        <Icon icon="hugeicons:arrow-right-01" width={11} height={11} className="shrink-0" />
      </a>

      <div className="max-w-7xl mx-auto px-6 h-22 sm:h-24 flex items-center justify-between relative z-10">
        {/* GAUCHE : Logo Officiel — icone (image detouree) + texte "AGAPEO"
            ecrit en vrai texte rose (net a toute taille, pas de detourage
            image a gerer pour le mot). */}
        <div className="flex items-center">
          <Link href="/" className="flex flex-col items-center group py-2">
            <img src="/images/agapeo-symbol.png" alt="" className="h-9 sm:h-10 md:h-11 lg:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105" />
            <span className="mt-0.5 font-display font-light tracking-tight text-[#FE72B2] text-sm sm:text-base md:text-lg leading-none">AGAPEO</span>
          </Link>
        </div>

        {/* CENTRE : Menu (centré entre le logo et les boutons) */}
        <nav className="hidden lg:flex items-center justify-center gap-10">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-zinc-600 hover:text-[#E83E75] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* DROITE : Boutons & Menu Mobile Toggle */}
        <div className="flex items-center justify-end gap-6">
          <Link href="/login" className="hidden lg:block text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors">
            Se connecter
          </Link>
          <Link
            href="/register"
            className="hidden lg:flex bg-[#E83E75] text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-[#d42d62] transition-all shadow-sm shadow-[#E83E75]/20 items-center gap-2"
          >
            Rejoindre AGAPEO
            <Icon icon="hugeicons:arrow-right-01" width={15} height={15} />
          </Link>

          {/* Hamburger Icon for Mobile */}
          <button 
            className="lg:hidden text-zinc-900 p-2 -mr-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            <Icon icon={isMobileMenuOpen ? "solar:close-circle-linear" : "solar:hamburger-menu-linear"} width={30} height={30} />
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN OVERLAY */}
      <div 
        className={`lg:hidden absolute top-full left-0 w-full bg-white border-b border-zinc-100 shadow-xl transition-all duration-300 ease-in-out origin-top ${
          isMobileMenuOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 pointer-events-none"
        }`}
      >
        <div className="px-6 py-8 flex flex-col gap-6">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-lg font-medium text-zinc-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          
          <div className="flex flex-col gap-4 pt-6 border-t border-zinc-100">
            <Link 
              href="/login" 
              className="text-center py-3.5 text-zinc-700 font-medium border border-zinc-200 rounded-full hover:bg-zinc-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Se connecter
            </Link>
            <Link 
              href="/register" 
              className="text-center py-3.5 bg-[#E83E75] text-white rounded-full font-medium shadow-sm shadow-[#E83E75]/30 flex items-center justify-center gap-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Rejoindre AGAPEO
              <Icon icon="hugeicons:arrow-right-01" width={16} height={16} />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
