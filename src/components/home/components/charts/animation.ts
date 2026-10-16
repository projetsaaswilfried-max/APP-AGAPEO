import type { Transition } from 'motion/react'

// Adapté de Bklit UI (packages/ui/src/charts/animation.ts)
export const DEFAULT_CHART_ENTER_TRANSITION: Transition = {
  type: 'tween',
  duration: 1.1,
  ease: [0.85, 0, 0.15, 1],
}
