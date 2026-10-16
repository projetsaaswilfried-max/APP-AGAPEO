'use client'

import { useSmoothScroll } from './useSmoothScroll'

/** Active le défilement doux Lenis tant que la landing est affichée (détruit en quittant la page). */
export default function SmoothScroll() {
  useSmoothScroll()
  return null
}
