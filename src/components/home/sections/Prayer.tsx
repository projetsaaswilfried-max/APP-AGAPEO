'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import WordRotator from '../components/WordRotator'
import { Button, Eyebrow, LINKS, Reveal } from '../lib/ui'

function ArchPhoto({ src, alt, rotate, className }: { src: string; alt: string; rotate: number; className?: string }) {
  return (
    <div className={className} style={{ rotate: `${rotate}deg` }}>
      <div className="arch rounded-b-[28px] bg-white/[0.06] p-2 ring-1 ring-white/10">
        <div className="arch relative aspect-[3/4.1] overflow-hidden rounded-b-[22px]">
          <img src={src} alt={alt} loading="lazy" className="absolute inset-0 size-full object-cover" />
        </div>
      </div>
    </div>
  )
}

export default function Prayer() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const up = useTransform(scrollYProgress, [0, 1], [70, -70])
  const down = useTransform(scrollYProgress, [0, 1], [-40, 90])

  return (
    <section className="px-3 sm:px-5">
      <div ref={ref} className="relative mx-auto max-w-[1320px] overflow-hidden rounded-[32px] bg-ink px-5 py-20 text-white sm:rounded-[40px] sm:px-10 sm:py-28">
        <div className="mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-[1fr_1.5fr_1fr] lg:gap-10">
          <motion.div style={{ y: up }} className="order-2 hidden lg:order-1 lg:block">
            <ArchPhoto src="/images/home/bible-hands.jpg" alt="Une main posée sur une Bible ouverte" rotate={-4} />
          </motion.div>

          <div className="order-1 text-center lg:order-2">
            <Reveal>
              <Eyebrow tone="dark">Une prière, pas un algorithme</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
                Tu as prié pour <span className="text-rose-soft">la bonne personne.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-5 max-w-[420px] text-[16px] leading-relaxed text-white/60 sm:text-[17px]">
                Peut-être as-tu demandé à Dieu une personne qui comprendrait ta foi.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <p className="mx-auto mt-10 max-w-[460px] rounded-[24px] bg-white/[0.06] px-6 py-6 font-urbanist text-[clamp(24px,2.8vw,36px)] leading-[1.15] font-medium ring-1 ring-white/10">
                Quelqu’un avec qui <WordRotator words={['prier,', 'grandir,', 'servir,', 'construire.']} className="text-rose-soft" />
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mx-auto mt-10 max-w-[460px] text-[16px] leading-relaxed text-white/60 sm:text-[17px]">
                AGAPEO ne peut pas te promettre qui tu rencontreras.{' '}
                <span className="text-white">Mais nous pouvons créer l’espace où cette rencontre devient possible.</span>
              </p>
            </Reveal>
            <Reveal delay={0.25} className="mt-9 flex justify-center">
              <Button href={LINKS.register} variant="light">Rejoindre AGAPEO</Button>
            </Reveal>
          </div>

          <motion.div style={{ y: down }} className="order-3 hidden lg:block">
            <ArchPhoto src="/images/home/worship.jpg" alt="Des fidèles levant leur Bible pendant un culte" rotate={4} />
          </motion.div>

          {/* Mobile : les deux arches côte à côte */}
          <div className="order-2 grid grid-cols-2 gap-3 lg:hidden">
            <ArchPhoto src="/images/home/bible-hands.jpg" alt="Une main posée sur une Bible ouverte" rotate={-3} />
            <ArchPhoto src="/images/home/worship.jpg" alt="Des fidèles levant leur Bible pendant un culte" rotate={3} className="mt-8" />
          </div>
        </div>
      </div>
    </section>
  )
}
