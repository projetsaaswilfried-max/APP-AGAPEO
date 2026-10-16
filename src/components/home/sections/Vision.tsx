'use client'

import { HandHeartIcon, Target02Icon, HeartHandshakeIcon } from '@hugeicons/core-free-icons'
import type { ReactNode } from 'react'
import { Eyebrow, Icon, Reveal, cn } from '../lib/ui'

const VALUES = ['Famille', 'Engagement', 'Fidélité', 'Service', 'Foi', 'Projets']

const PILLARS: { n: string; visual: ReactNode; t: string; d: string; extra?: ReactNode; highlight?: boolean }[] = [
  {
    n: '01',
    visual: <Icon icon={HandHeartIcon} size={24} />,
    t: 'Une foi réellement partagée',
    d: 'Découvre des personnes pour qui suivre Christ fait réellement partie du quotidien.',
  },
  {
    n: '02',
    visual: <Icon icon={Target02Icon} size={24} />,
    t: 'Des intentions claires',
    d: 'Exprime ce que tu recherches et rencontre des personnes qui souhaitent elles aussi construire une relation sérieuse.',
  },
  {
    n: '03',
    visual: <Icon icon={HeartHandshakeIcon} size={24} />,
    t: 'Des valeurs qui rapprochent',
    d: 'Découvre ce que vous avez réellement en commun.',
    extra: (
      <ul className="mt-5 flex flex-wrap gap-1.5">
        {VALUES.map((v) => (
          <li key={v} className="rounded-full bg-blush px-3 py-1.5 text-[12.5px] font-semibold text-rose-deep">
            {v}
          </li>
        ))}
      </ul>
    ),
  },
  {
    n: '04',
    visual: <img src="/images/home/logo.png" alt="" className="size-7 object-contain brightness-0 invert" />,
    t: 'Christ au centre',
    d: 'La foi n’arrive pas après la relation : elle peut en faire partie dès le commencement.',
    highlight: true,
  },
]

export default function Vision() {
  return (
    <section className="px-4 pb-20 sm:px-5 sm:pb-32">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid items-end gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <Reveal>
              <Eyebrow>Une autre vision de la rencontre chrétienne</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
                Quelqu’un avec qui <span className="title-accent">avancer dans la foi.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <p className="text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">
              <span className="font-semibold text-ink">Ne choisis pas seulement quelqu’un qui te plaît.</span> Une relation chrétienne ne repose
              pas uniquement sur l’attirance. Elle se construit aussi autour de convictions communes et d’une vision compatible de la vie.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-3 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <Reveal
              key={p.n}
              delay={i * 0.08}
              className={cn(
                'flex flex-col rounded-[28px] p-6 sm:p-7',
                p.highlight ? 'bg-blush' : 'bg-white ring-1 ring-line',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'grid size-12 place-items-center rounded-[16px]',
                    p.highlight ? 'bg-rose text-white' : 'bg-blush text-rose',
                  )}
                >
                  {p.visual}
                </span>
                <span className="font-urbanist text-[15px] font-semibold text-ink/25 tabular-nums">{p.n}</span>
              </div>
              <h3 className="mt-8 font-urbanist text-[23px] leading-[1.15] font-semibold lg:mt-10">{p.t}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">{p.d}</p>
              {p.extra}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
