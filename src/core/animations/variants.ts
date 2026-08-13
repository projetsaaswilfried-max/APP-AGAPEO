import { Variants } from "framer-motion";

// Cubic bezier d'amorti universel du Design System V1 avec tuple as const pour Framer Motion
export const TRANSITION_EASE = [0.16, 1, 0.3, 1] as const;

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: TRANSITION_EASE } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: TRANSITION_EASE } }
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: TRANSITION_EASE } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15, ease: TRANSITION_EASE } }
};

export const drawerSlideRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: TRANSITION_EASE } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2, ease: TRANSITION_EASE } }
};

export const modalScale: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: TRANSITION_EASE } },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15, ease: TRANSITION_EASE } }
};

export const hoverMicroScale = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.01, y: -2, transition: { duration: 0.2, ease: TRANSITION_EASE } },
  tap: { scale: 0.98 }
};
