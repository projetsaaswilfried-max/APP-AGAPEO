'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import HeroVideo from '../components/HeroVideo'

/** La vidéo s'élargit à mesure qu'elle entre dans l'écran. */
export default function Video() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const width = useTransform(scrollYProgress, [0, 1], ['78%', '100%'])

  return (
    <section id="video" ref={ref} className="scroll-mt-24 px-4 pb-20 sm:px-5 sm:pb-32">
      <motion.div style={{ ['--w' as string]: width }} className="mx-auto w-full max-w-[1320px] lg:w-[var(--w)]">
        <HeroVideo caption={false} frameClassName="rounded-[30px] bg-blush p-1.5 sm:rounded-[44px] sm:p-3" />
      </motion.div>
    </section>
  )
}
