"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { TRANSITION_EASE } from "@/core/animations/variants";

interface ScrollRevealProps extends Omit<HTMLMotionProps<"div">, "initial" | "whileInView" | "viewport" | "transition"> {
  delay?: number;
  y?: number;
}

/** Apparition douce au scroll, une seule fois — respecte prefers-reduced-motion (aucun mouvement, juste un fade instantané). */
export function ScrollReveal({ children, delay = 0, y = 20, className, ...props }: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reduceMotion ? 0.01 : 0.6, delay: reduceMotion ? 0 : delay, ease: TRANSITION_EASE }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
