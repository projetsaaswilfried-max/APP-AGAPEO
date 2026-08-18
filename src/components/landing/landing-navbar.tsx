"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "#decouvrir", label: "Découvrir AGAPEO" },
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#tarifs", label: "Tarifs" }
];

export function LandingNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100/50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-10">
        {/* GAUCHE : Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/images/agapeo-logo-official.png" alt="Agapeo Logo" className="h-8 md:h-10 w-auto object-contain" />
            <span className="text-xl tracking-tighter text-[#E83E75] font-bricolage font-semibold">AGAPEO</span>
          </Link>
        </div>

        {/* CENTRE : Menu (centré entre le logo et les boutons) */}
        <nav className="hidden lg:flex items-center justify-center gap-10">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-light text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* DROITE : Boutons & Menu Mobile Toggle */}
        <div className="flex items-center justify-end gap-6">
          <Link href="/login" className="hidden lg:block text-sm font-light text-zinc-600 hover:text-zinc-900 transition-colors">
            Se connecter
          </Link>
          <Link
            href="/register"
            className="hidden lg:flex bg-[#E83E75] text-white text-sm font-light px-5 py-2.5 rounded-full hover:bg-[#d42d62] transition-all shadow-sm shadow-[#E83E75]/20 items-center gap-2"
          >
            Rejoindre AGAPEO
            <Icon icon="hugeicons:arrow-right-01" width={14} height={14} />
          </Link>

          {/* Hamburger Icon for Mobile */}
          <button 
            className="lg:hidden text-zinc-900 p-2 -mr-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            <Icon icon={isMobileMenuOpen ? "solar:close-circle-linear" : "solar:hamburger-menu-linear"} width={28} height={28} />
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN OVERLAY */}
      <div 
        className={`lg:hidden absolute top-20 left-0 w-full bg-white border-b border-zinc-100 shadow-xl transition-all duration-300 ease-in-out origin-top ${
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
