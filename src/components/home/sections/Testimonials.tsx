'use client'

import { AnimatePresence, motion, useAnimationFrame, useInView, useMotionValue, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import { ArrowLeft02Icon, ArrowRight02Icon, QuoteDownIcon } from '@hugeicons/core-free-icons'
import { Eyebrow, Icon, Reveal, cn, EASE } from '../lib/ui'

const T = [
  { name: 'Déborah', age: 27, country: 'Côte d’Ivoire', img: 'deborah', pos: '50% 25%', q: 'Je ne voulais plus avoir à expliquer pourquoi Dieu occupait une place aussi importante dans ma vie. Je voulais rencontrer quelqu’un qui le comprenne déjà.' },
  { name: 'Samuel', age: 25, country: 'Sénégal', img: 'samuel', pos: '30% 30%', q: 'Pour moi, être chrétien sur une fiche de profil ne suffisait pas. Je voulais savoir comment la personne vivait réellement sa foi.' },
  { name: 'Grâce', age: 28, country: 'Bénin', img: 'grace', pos: '40% 40%', q: 'Je voulais une relation dans laquelle on puisse parler de tout, mais aussi prier ensemble et avancer ensemble avec Dieu.' },
  { name: 'Emmanuel', age: 26, country: 'Togo', img: 'emmanuel', pos: '50% 30%', q: 'J’ai longtemps cherché sur d’autres applications, mais il manquait toujours l’essentiel : partager les mêmes valeurs spirituelles. Ici, j’ai trouvé une vraie communauté bienveillante.' },
  { name: 'Léa', age: 25, country: 'Mali', img: 'lea', pos: '50% 25%', q: 'Au-delà des rencontres, c’est la profondeur des échanges qui m’a marquée. On se comprend sur l’essentiel dès le premier message, ça change tout.' },
  { name: 'David', age: 29, country: 'Cameroun', img: 'david', pos: '58% 30%', q: 'Trouver une personne sincère et engagée n’a jamais été aussi fluide. Agapeo permet de fonder des relations fortes basées sur le respect et la foi.' },
]

const DURATION = 5000

export default function Testimonials() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const progress = useMotionValue(0)
  const ring = useTransform(progress, (v) => `${v * 100}%`)

  useAnimationFrame((_, delta) => {
    if (paused || !inView) return
    const v = progress.get() + delta / DURATION
    if (v >= 1) {
      progress.set(0)
      setI((x) => (x + 1) % T.length)
    } else progress.set(v)
  })

  const go = (n: number) => {
    setI((n + T.length) % T.length)
    progress.set(0)
  }
  const t = T[i]

  return (
    <section id="temoignages" className="scroll-mt-24 px-3 sm:px-5">
      <div
        ref={ref}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
        className="mx-auto max-w-[1320px] rounded-[32px] bg-cream px-4 py-14 sm:rounded-[44px] sm:px-10 sm:py-20 lg:px-16"
      >
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <Reveal>
                <Eyebrow>La communauté Agapeo</Eyebrow>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-5 font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
                  Ils cherchaient <span className="title-accent whitespace-nowrap">une foi partagée.</span>
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.1} className="flex gap-2">
              <button onClick={() => go(i - 1)} aria-label="Témoignage précédent" className="grid size-12 place-items-center rounded-full bg-white ring-1 ring-line transition-colors hover:bg-ink hover:text-white">
                <Icon icon={ArrowLeft02Icon} size={20} />
              </button>
              <button onClick={() => go(i + 1)} aria-label="Témoignage suivant" className="grid size-12 place-items-center rounded-full bg-ink text-white transition-colors hover:bg-rose">
                <Icon icon={ArrowRight02Icon} size={20} />
              </button>
            </Reveal>
          </div>

          <div className="mt-8 grid items-center gap-8 sm:mt-14 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            {/* Portrait */}
            <div className="portrait-arch relative isolate mx-auto hidden sm:block aspect-[4/4.4] w-full max-w-[320px] overflow-hidden bg-ink/10 [transform:translateZ(0)] sm:aspect-[4/5] sm:max-w-[380px]">
              <AnimatePresence initial={false}>
                <motion.img
                  key={t.img}
                  src={`/images/home/${t.img}.jpg`}
                  alt={`${t.name}, ${t.age} ans`}
                  className="portrait-arch absolute inset-0 size-full object-cover"
                  style={{ objectPosition: t.pos }}
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: EASE }}
                />
              </AnimatePresence>
              <span className="glass absolute inset-x-4 bottom-4 rounded-[24px] px-4 py-3">
                <span className="block text-[15px] font-semibold text-ink">
                  {t.name}, {t.age} ans
                </span>
                <span className="block text-[13px] text-ink/60">{t.country}</span>
              </span>
            </div>

            {/* Citation */}
            <div>
              <Icon icon={QuoteDownIcon} size={40} className="text-rose" />
              <div className="relative mt-5 min-h-[165px] sm:mt-6 sm:min-h-[220px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.blockquote
                    key={t.name}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="font-urbanist text-[clamp(20px,2.6vw,36px)] leading-[1.28] font-medium tracking-[-0.025em]"
                  >
                    « {t.q} »
                  </motion.blockquote>
                </AnimatePresence>
              </div>

              {/* Mobile : le nom remplace le portrait */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={`who-${t.name}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-5 text-[14px] text-ink-muted sm:hidden"
                >
                  <span className="font-semibold text-ink">
                    {t.name}, {t.age} ans
                  </span>{' '}
                  · {t.country}
                </motion.p>
              </AnimatePresence>

              <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-2.5">
                {T.map((p, k) => (
                  <button key={p.img} onClick={() => go(k)} aria-label={`Témoignage de ${p.name}`} className="relative">
                    <img
                      src={`/images/home/${p.img}.jpg`}
                      alt=""
                      className={cn('size-11 rounded-full object-cover object-top transition-all duration-500 sm:size-14', k === i ? 'opacity-100' : 'opacity-45 grayscale hover:opacity-80')}
                    />
                    {k === i && (
                      <span className="absolute -bottom-2 left-1/2 h-[3px] w-8 -translate-x-1/2 overflow-hidden rounded-full bg-rose/20">
                        <motion.span className="block h-full rounded-full bg-rose" style={{ width: ring }} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
