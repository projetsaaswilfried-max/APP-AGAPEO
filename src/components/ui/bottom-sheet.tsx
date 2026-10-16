"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

/** Feuille glissant depuis le bas, format app native — réservé au rendu mobile (`md:hidden` côté appelant), jamais utilisée seule sur desktop. */
export function BottomSheet({ isOpen, onClose, title, description, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/45 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto bg-card rounded-t-[28px] shadow-soft p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] select-none"
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                {title && <h3 className="text-base font-display font-semibold text-foreground tracking-tight">{title}</h3>}
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
              </div>
              <button onClick={onClose} className="p-1.5 -mr-1.5 -mt-0.5 text-muted-foreground hover:text-foreground rounded-full shrink-0" aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <div className="pt-3">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
