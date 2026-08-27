"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { fadeIn, modalScale } from "@/core/animations/variants";

export interface ImageLightboxProps {
  /** null = fermé. */
  src: string | null;
  alt?: string;
  onClose: () => void;
  /** Contenu optionnel affiché sous l'image (statut, infos, comparaison avec un selfie...). */
  children?: React.ReactNode;
}

/** Vue agrandie plein écran d'une image, avec zone de contenu optionnelle en dessous — réutilisée par l'admin (dossiers de vérification/photos) et "Mes Photos". */
export function ImageLightbox({ src, alt = "", onClose, children }: ImageLightboxProps) {
  React.useEffect(() => {
    if (!src) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [src, onClose]);

  return (
    <AnimatePresence>
      {src && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
          />

          <motion.div
            variants={modalScale}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative z-10 w-full max-w-2xl max-h-full overflow-y-auto flex flex-col items-center gap-4"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute top-2 right-2 sm:-top-11 sm:right-0 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-colors z-20"
            >
              <X size={18} />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="w-full max-h-[70vh] object-contain rounded-2xl shadow-soft select-none" />

            {children && (
              <div className="w-full bg-card border border-border/40 rounded-2xl p-4 shadow-soft text-left" onClick={(e) => e.stopPropagation()}>
                {children}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
