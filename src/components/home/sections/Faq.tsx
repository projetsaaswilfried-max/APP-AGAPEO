'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Add01Icon } from '@hugeicons/core-free-icons'
import { Button, Eyebrow, Icon, LINKS, Reveal, cn, EASE } from '../lib/ui'
import { FAQ } from '../faq-data'

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="px-5 py-20 sm:py-32">
      <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Reveal>
            <Eyebrow>Questions fréquentes</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
              Avant de rejoindre <span className="title-accent whitespace-nowrap">AGAPEO.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-9 hidden lg:block">
            <Button href={LINKS.register} variant="dark">Créer mon profil</Button>
          </Reveal>
        </div>

        <div className="flex flex-col gap-2.5">
          {FAQ.map((f, i) => {
            const on = open === i
            return (
              <Reveal key={f.q} delay={i * 0.04}>
                <div className={cn('rounded-[20px] transition-colors duration-500', on ? 'bg-blush' : 'bg-white ring-1 ring-line')}>
                  <button
                    onClick={() => setOpen(on ? null : i)}
                    aria-expanded={on}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-[18px]"
                  >
                    <span className="text-[15px] font-semibold sm:text-[16px]">{f.q}</span>
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-full transition-all duration-500 ease-out-soft',
                        on ? 'rotate-45 bg-rose text-white' : 'bg-blush text-rose',
                      )}
                    >
                      <Icon icon={Add01Icon} size={16} />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-[620px] px-5 pb-5 text-[15px] leading-relaxed text-ink/70 sm:px-6 sm:pb-6">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
