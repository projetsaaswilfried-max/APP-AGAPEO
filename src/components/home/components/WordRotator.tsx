'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

/** Fait défiler des mots à la verticale. L'ancien et le nouveau mot partagent la même cellule : jamais de vide. */
export default function WordRotator({ words, interval = 2200, className }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0)
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '')

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % words.length), interval)
    return () => clearInterval(id)
  }, [words.length, interval])

  return (
    <span className={`relative inline-grid overflow-hidden py-[0.08em] align-bottom ${className ?? ''}`}>
      <span className="sr-only">{words[i]}</span>
      <span aria-hidden className="invisible [grid-area:1/1]">{longest}</span>
      <AnimatePresence initial={false}>
        <motion.span
          key={i}
          aria-hidden
          className="[grid-area:1/1]"
          initial={{ y: '110%' }}
          animate={{ y: '0%' }}
          exit={{ y: '-110%' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
