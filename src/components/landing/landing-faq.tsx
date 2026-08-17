"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

const FAQ_ITEMS = [
  { q: "Qu'est-ce qu'AGAPEO ?", a: "Une plateforme sociale chrétienne qui aide les célibataires à découvrir des personnes compatibles en vue du mariage, tout en proposant des contenus pour mieux comprendre les relations et la vie à deux." },
  { q: "À qui s'adresse la plateforme ?", a: "Aux célibataires chrétiens qui recherchent sérieusement un conjoint, dans une démarche orientée vers le mariage." },
  { q: "Comment fonctionne la compatibilité ?", a: "Elle se base sur ce que vous partagez avec l'autre personne : vision du mariage, valeurs, foi, personnalité, projets de vie et centres d'intérêt." },
  { q: "Puis-je discuter avec quelqu'un ?", a: "Oui, une messagerie privée moderne permet d'échanger du texte, des photos, des notes vocales et des documents." },
  { q: "Comment protégez-vous les utilisateurs ?", a: "Profils vérifiés, signalement, blocage, modération et réglages de confidentialité sont intégrés à la plateforme." },
  { q: "AGAPEO est-elle gratuite ?", a: "La création de profil et la découverte de base sont gratuites. Un abonnement Premium débloque des fonctionnalités supplémentaires." }
];

function FaqItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-3xl border transition-all duration-300 ${isOpen ? "bg-card border-border/60 shadow-sm" : "bg-transparent border-transparent hover:bg-card/50"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-sm sm:text-base font-medium text-foreground">{question}</span>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-300 ${isOpen ? "bg-primary text-primary-foreground" : "bg-accent-subtle text-primary"}`}>
          <HugeIcon icon={ChevronDownIcon} size={16} className={`shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-6 pt-1 text-sm text-muted-foreground leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="max-w-2xl mx-auto px-5 sm:px-8">
        <ScrollReveal className="text-center mb-12">
          <span className="text-sm font-medium text-primary">FAQ</span>
          <h2 className="mt-2 font-landing text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            Questions fréquentes
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem
              key={item.q}
              question={item.q}
              answer={item.a}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}
