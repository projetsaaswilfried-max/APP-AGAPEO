"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { AgapeoLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { TRANSITION_EASE } from "@/core/animations/variants";

const NAV_LINKS = [
  { href: "#decouvrir", label: "Découvrir" },
  { href: "#enseignements", label: "Enseignements" },
  { href: "#securite", label: "Sécurité" },
  { href: "#faq", label: "FAQ" }
];

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/85 backdrop-blur-md border-b border-border/60" : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <AgapeoLogo href="/" size="sm" />

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3.5 py-2 text-sm font-medium text-foreground/70 hover:text-foreground rounded-full hover:bg-secondary/60 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Se connecter
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">
              Créer mon profil
            </Button>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="lg:hidden p-2 -mr-2 text-foreground rounded-full hover:bg-secondary/60"
          aria-label="Ouvrir le menu"
        >
          <HugeIcon icon={Menu01Icon} size={22} />
        </button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-xs lg:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: TRANSITION_EASE }}
              className="fixed inset-x-3 top-3 z-50 bg-card border border-border/60 rounded-3xl shadow-soft p-5 lg:hidden"
            >
              <div className="flex items-center justify-between mb-5">
                <AgapeoLogo href="/" size="sm" />
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary"
                  aria-label="Fermer"
                >
                  <HugeIcon icon={Cancel01Icon} size={20} />
                </button>
              </div>
              <nav className="flex flex-col gap-1 mb-5">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="px-3.5 py-3 text-sm font-medium text-foreground rounded-xl hover:bg-secondary/60 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="flex flex-col gap-2">
                <Link href="/register" className="w-full">
                  <Button variant="primary" size="md" className="w-full">
                    Créer mon profil
                  </Button>
                </Link>
                <Link href="/login" className="w-full">
                  <Button variant="ghost" size="md" className="w-full">
                    Se connecter
                  </Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
