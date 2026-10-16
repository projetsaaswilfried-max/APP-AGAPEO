'use client'

import { motion } from 'motion/react'
import { ChurchIcon, Compass01Icon, HeartHandshakeIcon, SmileIcon } from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { Eyebrow, Icon, Reveal, cn, EASE } from '../lib/ui'
import { PROFILES, ProfileCard } from '../components/ProfileCard'

type Note = { icon: IconSvgElement; t: string; d: string }

const EMMANUEL = PROFILES[1]

const LEFT: Note[] = [
  { icon: Compass01Icon, t: 'Son parcours', d: 'Son histoire, son chemin avec Dieu et ce qui l’a construit.' },
  { icon: SmileIcon, t: 'Sa personnalité', d: 'Ce qui le passionne, ce qui le fait rire, sa façon d’aimer.' },
]
const RIGHT: Note[] = [
  { icon: HeartHandshakeIcon, t: 'Ses valeurs', d: 'Famille, fidélité, service : ce qui oriente ses décisions.' },
  { icon: ChurchIcon, t: 'Sa manière de vivre sa foi', d: 'Sa confession, sa vie d’église, la place de Dieu au quotidien.' },
]

function Callout({ n, side, i }: { n: Note; side: 'left' | 'right'; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -24 : 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.12 }}
      className={cn('relative flex flex-col gap-3 rounded-[22px] bg-white p-4 ring-1 ring-line sm:flex-row sm:gap-4 sm:rounded-[24px] sm:p-5', side === 'left' ? 'lg:flex-row-reverse lg:text-right' : '')}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[16px] bg-blush text-rose sm:size-11">
        <Icon icon={n.icon} size={20} />
      </span>
      <div>
        <p className="text-[14.5px] leading-snug font-semibold sm:text-[16px]">{n.t}</p>
        <p className="mt-1 text-[13px] leading-snug text-ink-muted sm:text-[14px] sm:leading-relaxed">{n.d}</p>
      </div>
      {/* connecteur vers la fiche */}
      <span
        aria-hidden
        className={cn(
          'absolute top-1/2 hidden h-px w-14 bg-rose/35 lg:block xl:w-20',
          side === 'left' ? 'left-full' : 'right-full',
        )}
      >
        <span className={cn('absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-rose', side === 'left' ? 'right-0' : 'left-0')} />
      </span>
    </motion.div>
  )
}

export default function ProfileDetails() {
  return (
    <section className="overflow-hidden px-4 py-20 sm:px-5 sm:py-32">
      <div className="mx-auto max-w-[1240px]">
        <div className="mx-auto max-w-[640px] text-center">
          <Reveal>
            <Eyebrow>Des célibataires qui partagent ta foi</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
              Découvre ce qui <span className="title-accent whitespace-nowrap">guide sa vie.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-5 max-w-[520px] text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">
              Savoir qu’une personne est chrétienne est important. Comprendre comment elle vit sa foi l’est encore plus.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid items-center gap-3 sm:mt-20 sm:gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-14 xl:gap-20">
          <div className="order-2 grid grid-cols-2 gap-3 sm:flex sm:flex-col sm:gap-4 lg:order-1 lg:gap-24">
            {LEFT.map((n, i) => (
              <Callout key={n.t} n={n} side="left" i={i} />
            ))}
          </div>

          <Reveal className="order-1 mx-auto mb-6 w-full max-w-[340px] lg:order-2 lg:mb-0">
            <div className="relative">
              <ProfileCard p={EMMANUEL} shape="soft" />
            </div>
          </Reveal>

          <div className="order-3 grid grid-cols-2 gap-3 sm:flex sm:flex-col sm:gap-4 lg:gap-24">
            {RIGHT.map((n, i) => (
              <Callout key={n.t} n={n} side="right" i={i + 2} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
