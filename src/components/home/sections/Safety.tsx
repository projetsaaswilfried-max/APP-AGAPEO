'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckmarkBadge01Icon, ShieldUserIcon, SquareLock02Icon, UserBlock01Icon, Flag02Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { Eyebrow, Icon, Reveal, cn, EASE } from '../lib/ui'

const ITEMS = [
  { icon: CheckmarkBadge01Icon, t: 'Profils vérifiés', d: 'Des vérifications pour limiter les faux profils et les comptes frauduleux.' },
  { icon: ShieldUserIcon, t: 'Communauté modérée', d: 'Les comportements contraires aux règles peuvent être signalés et modérés.' },
  { icon: SquareLock02Icon, t: 'Vie privée protégée', d: 'Tu contrôles les informations que tu affiches et partages.' },
  { icon: UserBlock01Icon, t: 'Signaler ou bloquer', d: 'Une interaction te met mal à l’aise ? Limite-la, bloque ou signale en un geste.' },
]

export function Toggle({ label, initial }: { label: string; initial: boolean }) {
  const [on, setOn] = useState(initial)
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left text-[14.5px] font-medium"
    >
      {label}
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300', on ? 'bg-rose' : 'bg-ink/15')}>
        <motion.span
          className="absolute top-1 left-1 size-5 rounded-full bg-white shadow-[0_1px_3px_0_rgb(0_0_0/0.1),0_1px_2px_-1px_rgb(0_0_0/0.1)]"
          animate={{ x: on ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  )
}

/** Panneau inspiré des réglages de l'application */
function SafetyPanel() {
  return (
    <div className="rounded-[32px] bg-blush p-3 sm:p-5">
      <div className="rounded-[24px] bg-white p-5 shadow-[0_30px_60px_-36px_rgb(204_28_84/0.45)] sm:p-6">
        <div className="flex items-center justify-between">
          <p className="font-urbanist text-[20px] font-semibold">Sécurité & confidentialité</p>
          <span className="grid size-9 place-items-center rounded-full bg-blush text-rose">
            <Icon icon={ShieldUserIcon} size={18} />
          </span>
        </div>

        {/* Vérification */}
        <div className="mt-5 flex items-center gap-3.5 rounded-[20px] bg-paper p-3.5 ring-1 ring-line">
          <img src="/images/home/emmanuel.jpg" alt="" className="size-12 rounded-[16px] object-cover object-[50%_30%]" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[15px] font-semibold">
              Emmanuel, 26 <Icon icon={CheckmarkBadge01Icon} size={16} className="text-rose" />
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8">
              <motion.div
                className="h-full rounded-full bg-rose"
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, ease: EASE, delay: 0.3 }}
              />
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700">
            <Icon icon={Tick02Icon} size={12} strokeWidth={2.6} /> Vérifié
          </span>
        </div>

        {/* Vie privée */}
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">Ce que je partage</p>
        <div className="mt-1 divide-y divide-line">
          <Toggle label="Afficher ma ville" initial />
          <Toggle label="Afficher ma confession" initial />
          <Toggle label="Masquer mon profil" initial={false} />
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <span className="flex h-11 items-center justify-center gap-2 rounded-full text-[14px] font-semibold ring-1 ring-line">
            <Icon icon={Flag02Icon} size={16} /> Signaler
          </span>
          <span className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-semibold text-white">
            <Icon icon={UserBlock01Icon} size={16} /> Bloquer
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Safety() {
  return (
    <section className="px-4 py-20 sm:px-5 sm:py-32">
      <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[1fr_0.95fr] lg:gap-20">
        <div>
          <Reveal>
            <Eyebrow>Une communauté à protéger</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
              Des rencontres sincères, <span className="title-accent whitespace-nowrap">en sécurité.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-[500px] text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">
              Partager la même foi ne dispense jamais d’être prudent. AGAPEO met en place plusieurs protections pour faire connaissance avec
              davantage de sérénité.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-x-8 sm:grid-cols-2">
            {ITEMS.map((it, i) => (
              <Reveal key={it.t} delay={0.1 + i * 0.06} className="flex gap-4 border-t border-line py-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-blush text-rose">
                  <Icon icon={it.icon} size={20} />
                </span>
                <div>
                  <h3 className="text-[16px] font-semibold">{it.t}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{it.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.1} className="mx-auto w-full max-w-[480px] lg:mr-0">
          <SafetyPanel />
        </Reveal>
      </div>
    </section>
  )
}
