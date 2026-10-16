'use client'

import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useRef } from 'react'
import { Cancel01Icon, Tick02Icon, FavouriteIcon } from '@hugeicons/core-free-icons'
import { Eyebrow, Icon, Reveal, EASE } from '../lib/ui'

/* Portraits de la communauté, disposés autour du titre (grand écran) */
const PEOPLE = [
  { src: 'deborah', x: '2%', y: '2%', s: 116, r: -6, depth: 60 },
  { src: 'samuel', x: '13%', y: '44%', s: 96, r: 5, depth: 120, heart: true },
  { src: 'lea', x: '1%', y: '76%', s: 88, r: -3, depth: 40 },
  { src: 'emmanuel', x: '83%', y: '0%', s: 104, r: 6, depth: 90, heart: true },
  { src: 'grace', x: '91%', y: '40%', s: 92, r: -5, depth: 50 },
  { src: 'david', x: '80%', y: '72%', s: 112, r: 4, depth: 110 },
]

const ROWS = [
  { no: 'Ta musique préférée', yes: 'Ta relation avec Dieu' },
  { no: 'Tes voyages', yes: 'Tes convictions' },
  { no: 'Tes passions', yes: 'Ta vision chrétienne du couple' },
]

function Portrait({ p, i, progress }: { p: (typeof PEOPLE)[number]; i: number; progress: MotionValue<number> }) {
  const y = useTransform(progress, [0, 1], [p.depth, -p.depth])
  return (
    <motion.div className="absolute" style={{ left: p.x, top: p.y, y }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: EASE, delay: 0.1 + i * 0.08 }}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6 + i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
          style={{ rotate: p.r }}
        >
          <img
            src={`/images/home/${p.src}.jpg`}
            alt=""
            className="rounded-[26px] object-cover object-top shadow-[0_24px_40px_-24px_rgb(14_19_27/0.45)] ring-4 ring-white"
            style={{ width: p.s, height: p.s * 1.18 }}
          />
          {p.heart && (
            <span className="absolute -right-2.5 -bottom-2.5 grid size-9 place-items-center rounded-full bg-rose text-white ring-4 ring-paper">
              <Icon icon={FavouriteIcon} size={16} strokeWidth={2.2} />
            </span>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default function Welcome() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })

  return (
    <section id="decouvrir" className="scroll-mt-24 px-4 py-20 sm:px-5 sm:py-32">
      <div className="mx-auto max-w-[1240px]">
        {/* Titre entouré de la communauté */}
        <div ref={ref} className="relative lg:py-24">
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
            {PEOPLE.map((p, i) => (
              <Portrait key={p.src} p={p} i={i} progress={scrollYProgress} />
            ))}
          </div>

          <div className="relative mx-auto max-w-[620px] text-center">
            {/* Mobile : la communauté en pile */}
            <Reveal className="mb-8 flex justify-center lg:hidden">
              <div className="flex -space-x-3">
                {PEOPLE.map((p) => (
                  <img key={p.src} src={`/images/home/${p.src}.jpg`} alt="" className="size-12 rounded-[16px] object-cover object-top ring-3 ring-paper" />
                ))}
              </div>
            </Reveal>
            <Reveal>
              <Eyebrow>Bienvenue sur Agapeo</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
                Quelqu’un qui comprend <span className="title-accent whitespace-nowrap">vraiment ta foi.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-6 max-w-[520px] text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">
                Trouver quelqu’un qui comprend ta relation avec Dieu, tes convictions et ta vision chrétienne du couple, c’est une autre
                histoire. C’est précisément pour cela qu’AGAPEO existe.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Comparatif */}
        <Reveal delay={0.1} className="mx-auto mt-16 max-w-[880px] sm:mt-20">
          <div className="grid grid-cols-2 rounded-[28px] bg-white p-1.5 ring-1 ring-line sm:rounded-[32px] sm:p-2">
            <div className="px-3 pt-5 pb-3 sm:px-7 sm:pt-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/40 sm:text-[12px]">Ailleurs</p>
              <ul className="mt-3 sm:mt-4">
                {ROWS.map((r) => (
                  <li key={r.no} className="flex min-h-[64px] items-center gap-2.5 border-t border-line py-3 text-[13.5px] text-ink/45 sm:gap-3 sm:text-[16px]">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full ring-1 ring-line">
                      <Icon icon={Cancel01Icon} size={12} />
                    </span>
                    {r.no}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[22px] bg-blush px-3 pt-5 pb-3 sm:rounded-[26px] sm:px-7 sm:pt-7">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-rose sm:text-[12px]">
                <img src="/images/home/logo.png" alt="" className="size-4 object-contain" /> Sur AGAPEO
              </p>
              <ul className="mt-3 sm:mt-4">
                {ROWS.map((r, i) => (
                  <motion.li
                    key={r.yes}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.25 + i * 0.12 }}
                    className="flex min-h-[64px] items-center gap-2.5 border-t border-rose/15 py-3 text-[13.5px] font-semibold text-ink sm:gap-3 sm:text-[16px]"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-rose text-white">
                      <Icon icon={Tick02Icon} size={12} strokeWidth={2.6} />
                    </span>
                    {r.yes}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
