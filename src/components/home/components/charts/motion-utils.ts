import type { Transition } from 'motion/react'
import { DEFAULT_CHART_ENTER_TRANSITION } from './animation'

// Adapté de Bklit UI (packages/ui/src/charts/motion-utils.ts)
export function transitionWithDelay(
  transition: Transition | undefined,
  delaySeconds: number,
  fallback: Transition = DEFAULT_CHART_ENTER_TRANSITION,
): Transition {
  const base = transition ?? fallback
  return { ...base, delay: delaySeconds }
}
