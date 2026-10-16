'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const HEART = 'M12 21s-7.4-4.5-9.5-9C1 8.7 3 4.6 6.8 4.6c2.1 0 3.5 1.1 4.2 2.6.7-1.5 2.2-2.6 4.3-2.6 3.8 0 5.8 4.1 4.3 7.4C19.4 16.5 12 21 12 21z'

export function HeartGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={HEART} fill="currentColor" />
    </svg>
  )
}

type Bubble = { id: number; left: number; x: number; y: number; size: number; rot: number; bubble: boolean; tone: number }

const TONES = {
  rose: ['text-rose', 'text-rose-soft', 'text-rose-deep'],
  light: ['text-white', 'text-blush', 'text-white/80'],
}

/**
 * Fait s'échapper des cœurs et des « bulles d'amour » tout autour de l'élément tant qu'il est survolé.
 * `active` permet de piloter l'effet depuis le parent (ex. survol de toute la vignette vidéo).
 */
export default function HeartBurst({
  children,
  active,
  spread = 1,
  tone = 'rose',
  bubbles = 0.5,
  className,
}: {
  children: ReactNode
  active?: boolean
  spread?: number
  tone?: keyof typeof TONES
  /** Part des cœurs affichés dans une bulle blanche (0 → 1) */
  bubbles?: number
  className?: string
}) {
  const [hover, setHover] = useState(false)
  const [items, setItems] = useState<Bubble[]>([])
  const reduce = useReducedMotion()
  const nextId = useRef(0)
  const on = active ?? hover

  const spawn = (n: number) => {
    const batch: Bubble[] = Array.from({ length: n }, () => {
      const angle = ((-90 + (Math.random() * 150 - 75)) * Math.PI) / 180
      const dist = (55 + Math.random() * 55) * spread
      return {
        id: nextId.current++,
        left: 50 + (Math.random() * 70 - 35),
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 10,
        size: 12 + Math.random() * 12,
        rot: Math.random() * 50 - 25,
        bubble: Math.random() < bubbles,
        tone: Math.floor(Math.random() * 3),
      }
    })
    setItems((prev) => [...prev.slice(-28), ...batch])
  }

  useEffect(() => {
    if (!on || reduce) return
    spawn(5)
    const t = setInterval(() => spawn(3), 360)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, reduce])

  return (
    <span
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={() => setHover(false)}
      onPointerDown={(e) => e.pointerType !== 'mouse' && !reduce && spawn(6)}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {items.map((b) => (
          <motion.span
            key={b.id}
            className="absolute top-1/2"
            style={{ left: `${b.left}%` }}
            initial={{ x: '-50%', y: '-50%', scale: 0, opacity: 0, rotate: 0 }}
            animate={{ x: `calc(-50% + ${b.x}px)`, y: `calc(-50% + ${b.y}px)`, scale: [0, 1.1, 0.9], opacity: [0, 1, 0], rotate: b.rot }}
            transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1], times: [0, 0.35, 1] }}
            onAnimationComplete={() => setItems((prev) => prev.filter((p) => p.id !== b.id))}
          >
            {b.bubble ? (
              <span
                className="grid place-items-center rounded-full bg-white shadow-[0_6px_14px_-6px_rgb(204_28_84/0.55)] ring-1 ring-rose/15"
                style={{ width: b.size + 12, height: b.size + 12 }}
              >
                <span className="block text-rose" style={{ width: b.size * 0.62, height: b.size * 0.62 }}>
                  <HeartGlyph className="size-full" />
                </span>
              </span>
            ) : (
              <span className={`block ${TONES[tone][b.tone]}`} style={{ width: b.size, height: b.size }}>
                <HeartGlyph className="size-full" />
              </span>
            )}
          </motion.span>
        ))}
      </span>
      <span className="relative z-10 inline-flex w-full">{children}</span>
    </span>
  )
}
