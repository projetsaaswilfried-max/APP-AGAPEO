'use client'

import { motion } from 'motion/react'
import { useId } from 'react'

// Cœur classique, symétrique, dessiné dans une boîte 0–1 (clipPathUnits="objectBoundingBox")
const HEART =
  'M0.5,0.95 C0.5,0.95 0.02,0.66 0.02,0.33 C0.02,0.15 0.15,0.03 0.29,0.03 C0.39,0.03 0.46,0.08 0.5,0.17 C0.54,0.08 0.61,0.03 0.71,0.03 C0.85,0.03 0.98,0.15 0.98,0.33 C0.98,0.66 0.5,0.95 0.5,0.95 Z'

/** Photo découpée en cœur, bordée de rose poudré, avec un battement discret. */
export default function HeartImage({ src, alt, className, position = '50% 35%' }: { src: string; alt: string; className?: string; position?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <motion.div
      className={`relative aspect-square ${className ?? ''}`}
      animate={{ scale: [1, 1.03, 1, 1.015, 1] }}
      transition={{ duration: 1.8, times: [0, 0.14, 0.28, 0.42, 0.7], repeat: Infinity, repeatDelay: 2.2, ease: 'easeOut' }}
    >
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <clipPath id={`heart-${id}`} clipPathUnits="objectBoundingBox">
            <path d={HEART} />
          </clipPath>
        </defs>
      </svg>
      {/* bordure : même cœur, légèrement plus grand */}
      <div className="absolute inset-0 bg-blush" style={{ clipPath: `url(#heart-${id})` }} />
      <div className="absolute inset-[3.5%]" style={{ clipPath: `url(#heart-${id})` }}>
        <img src={src} alt={alt} className="size-full object-cover" style={{ objectPosition: position }} />
      </div>
    </motion.div>
  )
}
