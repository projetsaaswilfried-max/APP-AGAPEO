'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import NumberFlow from '@number-flow/react'
import { Tick02Icon, Cancel01Icon, CrownIcon } from '@hugeicons/core-free-icons'
import { Button, Eyebrow, Icon, LINKS, Reveal, cn } from '../lib/ui'

const PLANS = [
  { id: 'week', label: '1 semaine', price: 2335, per: '/ 7 jours' },
  { id: 'half', label: '15 jours', price: 4086, per: '/ 15 jours' },
  { id: 'month', label: 'Mensuel', price: 7003, per: '/ mois' },
  { id: 'quarter', label: 'Trimestriel', price: 17507, per: '/ 3 mois', best: true },
]

const FREE_YES = ['Créer et compléter son profil', 'Être visible dans Découvrir', 'Recevoir des messages', 'Vérification de profil sous 48h']
const FREE_NO = [
  'Rechercher / filtrer les profils',
  'Consulter les profils',
  'Répondre aux messages / initier une conversation',
  'Mettre des profils en favori',
  'Voir qui s’intéresse à toi',
  'Profil mis en avant dans Découvrir',
]
const PLUS = [
  'Tout ce qui est inclus dans le plan Gratuit',
  'Consultation illimitée de profils',
  'Répondre aux messages et initier une conversation en premier',
  'Mettre des profils en favori',
  'Voir qui a consulté ou mis ton profil en favori',
  'Filtres de recherche avancés (ville, confession, engagement, profession, centres d’intérêt…)',
  'Profil mis en avant dans Découvrir',
  'Vérification de profil accélérée (moins de 24h)',
]

export default function Pricing() {
  const [plan, setPlan] = useState(3)
  const p = PLANS[plan]

  return (
    <section id="tarifs" className="scroll-mt-24 px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-[1240px]">
        <div className="mx-auto max-w-[760px] text-center">
          <Reveal>
            <Eyebrow>Rejoindre Agapeo</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
              Commence ta recherche <span className="title-accent whitespace-nowrap">gratuitement.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-7 max-w-[580px] text-[17px] leading-relaxed text-ink-muted">
              Crée ton profil, découvre la communauté et commence à rencontrer des célibataires chrétiens — choisis ensuite la durée
              d’abonnement qui te convient.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Gratuit */}
          <Reveal className="flex flex-col rounded-[36px] bg-white p-8 ring-1 ring-line sm:p-10">
            <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Gratuit</p>
            <p className="mt-5 font-urbanist text-[64px] leading-none font-medium">
              0 <span className="text-[22px] text-ink-muted">FCFA</span>
            </p>
            <p className="mt-3 text-[15px] text-ink-muted">L’essentiel pour commencer ta recherche.</p>

            <ul className="mt-8 flex flex-col gap-3.5 border-t border-line pt-8">
              {FREE_YES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[15px]">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-ink text-white">
                    <Icon icon={Tick02Icon} size={12} strokeWidth={2.4} />
                  </span>
                  {f}
                </li>
              ))}
              {FREE_NO.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[15px] text-ink/40">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-line">
                    <Icon icon={Cancel01Icon} size={11} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-10">
              <Button href={LINKS.register} variant="dark" full>Créer mon profil</Button>
            </div>
          </Reveal>

          {/* AGAPEO+ */}
          <Reveal delay={0.08} className="flex flex-col rounded-[36px] bg-ink p-8 text-white sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-rose-soft">
                <Icon icon={CrownIcon} size={16} /> AGAPEO+
              </p>
              <span className="text-[13px] text-white/50">Inclus dans ton abonnement Premium</span>
            </div>

            {/* Sélecteur de durée */}
            <div role="tablist" aria-label="Durée d’abonnement" className="mt-7 grid grid-cols-2 gap-2 rounded-[22px] bg-white/6 p-2 sm:grid-cols-4 sm:gap-1 sm:rounded-[20px] sm:p-1">
              {PLANS.map((pl, i) => (
                <button
                  key={pl.id}
                  role="tab"
                  aria-selected={plan === i}
                  onClick={() => setPlan(i)}
                  className={cn(
                    'relative flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-[16px] px-3 py-3 text-[14px] font-semibold ring-1 ring-white/10 transition-colors sm:block sm:min-h-0 sm:ring-0',
                    plan === i ? 'text-ink' : 'text-white/60 hover:text-white',
                  )}
                >
                  {plan === i && (
                    <motion.span layoutId="plan-pill" className="absolute inset-0 rounded-[16px] bg-white" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                  )}
                  <span className="relative">{pl.label}</span>
                  {pl.best && (
                    <span className="relative rounded-full bg-rose px-2 py-0.5 text-[9.5px] font-bold tracking-wide whitespace-nowrap text-white uppercase sm:absolute sm:-top-2.5 sm:right-1/2 sm:translate-x-1/2 sm:text-[10px]">
                      Recommandé
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-urbanist text-[clamp(56px,7vw,80px)] leading-none font-medium tabular-nums">
                <NumberFlow value={p.price} locales="fr-FR" />
              </span>
              <span className="text-[18px] text-white/60">
                FCFA <span className="text-white/40">{p.per}</span>
              </span>
            </div>
            <p className="mt-3 text-[14px] text-white/50">Renouvelable à tout moment.</p>

            <ul className="mt-8 grid gap-3.5 border-t border-white/10 pt-8 sm:grid-cols-2 sm:gap-x-8">
              {PLUS.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[15px] text-white/85">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-rose">
                    <Icon icon={Tick02Icon} size={12} strokeWidth={2.4} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-col gap-3 pt-10 sm:flex-row sm:items-center sm:justify-between">
              <Button href={LINKS.register} className="sm:min-w-[280px] sm:justify-between">Découvrir AGAPEO+</Button>
              <span className="text-[13px] text-white/45">Choisis ce plan une fois ton profil créé.</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
