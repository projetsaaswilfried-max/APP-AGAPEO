'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { HeartGlyph } from './HeartBurst'

/* L'homme, la femme, puis l'amour entre eux — en boucle */
const STAGES = [
  { kind: 'photo', src: '/images/home/face-man.jpg', alt: 'Un homme', ms: 1500 },
  { kind: 'photo', src: '/images/home/face-woman.jpg', alt: 'Une femme', ms: 1500 },
  { kind: 'love', ms: 1900 },
] as const

const SPARKS = [
  { x: -0.55, y: -0.5, s: 0.22, d: 0.12 },
  { x: 0.6, y: -0.42, s: 0.18, d: 0.2 },
  { x: -0.48, y: 0.55, s: 0.16, d: 0.28 },
  { x: 0.55, y: 0.5, s: 0.2, d: 0.16 },
]

/** Carré arrondi intégré dans un titre (taille en `em`, suit la taille du texte). */
export default function LoveTile({ delay = 0.2, className }: { delay?: number; className?: string }) {
  const [i, setI] = useState(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) return
    const t = setTimeout(() => setI((v) => (v + 1) % STAGES.length), STAGES[i].ms)
    return () => clearTimeout(t)
  }, [i, reduce])

  const stage = STAGES[i]

  return (
    <motion.span
      aria-hidden
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: 1, rotate: -6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 16, delay }}
      className={`relative mx-[0.12em] inline-block size-[0.88em] align-[-0.1em] ${className ?? ''}`}
    >
      {/* le carré : on le fait « respirer » à chaque changement */}
      <motion.span
        key={`pop-${i}`}
        className="absolute inset-0 grid overflow-hidden rounded-[0.26em] bg-blush shadow-[0_0.2em_0.45em_-0.18em_rgb(204_28_84/0.55)] ring-[0.045em] ring-white"
        initial={{ scale: 0.86 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 14 }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {stage.kind === 'photo' ? (
            <motion.img
              key={stage.src}
              src={stage.src}
              alt=""
              className="col-start-1 row-start-1 size-full object-cover"
              initial={{ opacity: 0, scale: 1.25 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : (
            <motion.span
              key="love"
              className="col-start-1 row-start-1 grid size-full place-items-center bg-[linear-gradient(135deg,var(--color-rose),var(--color-rose-soft))] text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <motion.span
                className="block size-[0.5em]"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [0, 1.35, 0.9, 1.08, 1], rotate: 0 }}
                transition={{ duration: 0.8, times: [0, 0.35, 0.55, 0.75, 1], ease: 'easeOut' }}
              >
                <HeartGlyph className="size-full" />
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>

      {/* petits cœurs qui s'échappent au moment du « love » */}
      {stage.kind === 'love' &&
        !reduce &&
        SPARKS.map((p, k) => (
          <motion.span
            key={`spark-${i}-${k}`}
            className="pointer-events-none absolute top-1/2 left-1/2 block text-rose"
            style={{ width: `${p.s}em`, height: `${p.s}em`, marginLeft: `-${p.s / 2}em`, marginTop: `-${p.s / 2}em` }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{ x: `${p.x}em`, y: `${p.y}em`, scale: [0, 1, 0.8], opacity: [0, 1, 0] }}
            transition={{ duration: 1.1, delay: p.d, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeartGlyph className="size-full" />
          </motion.span>
        ))}
    </motion.span>
  )
}
