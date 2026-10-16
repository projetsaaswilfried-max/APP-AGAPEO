'use client'

import { useInView } from 'motion/react'
import { useRef, useState, type CSSProperties } from 'react'
import { FavouriteIcon } from '@hugeicons/core-free-icons'
import { Button, Eyebrow, Icon, LINKS, Reveal, cn } from '../lib/ui'
import { RadarArea, RadarAxis, RadarChart, RadarGrid, RadarLabels, type RadarData, type RadarMetric } from '../components/charts'

const METRICS: RadarMetric[] = [
  { key: 'foi', label: 'Foi' },
  { key: 'eglise', label: 'Vie d’église' },
  { key: 'couple', label: 'Couple & mariage' },
  { key: 'valeurs', label: 'Valeurs' },
  { key: 'projets', label: 'Projets' },
  { key: 'perso', label: 'Personnalité' },
]

const DATA: RadarData[] = [
  { label: 'Samuel', color: 'var(--color-rose-soft)', values: { foi: 95, eglise: 84, couple: 92, valeurs: 88, projets: 78, perso: 72 } },
  { label: 'Grâce', color: 'var(--color-rose-deep)', values: { foi: 92, eglise: 90, couple: 95, valeurs: 84, projets: 86, perso: 80 } },
]

const PEOPLE = [
  { name: 'Samuel', img: '/images/home/samuel.jpg', pos: '30% 30%' },
  { name: 'Grâce', img: '/images/home/grace.jpg', pos: '40% 40%' },
]

const QUESTIONS = [
  { t: 'Ta foi', q: 'Quelle place Dieu occupe-t-il dans ton quotidien ?' },
  { t: 'Ta vie d’église', q: 'Comment vis-tu ta foi au sein de ta communauté ?' },
  { t: 'Ta vision du couple & mariage', q: 'Quelle place accordes-tu au mariage ?' },
  { t: 'Tes valeurs & projets', q: 'Dans quelle direction souhaites-tu construire ta vie ?' },
]

const CHART_VARS = {
  '--chart-label': 'var(--color-ink)',
  '--chart-background': '#ffffff',
  '--chart-foreground-muted': 'var(--color-ink-muted)',
  '--border': 'rgb(14 19 27 / 0.12)',
} as CSSProperties

export default function Compatibility() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section id="compatibilite" className="scroll-mt-24 px-3 sm:px-5">
      <div className="mx-auto max-w-[1320px] rounded-[32px] bg-blush px-4 py-14 sm:rounded-[44px] sm:px-10 sm:py-20 lg:px-16">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <Reveal>
              <Eyebrow>Plus que des critères</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-5 font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
                Être chrétien est <span className="title-accent">un point de départ.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-[480px] text-[16px] leading-relaxed text-ink/65 sm:text-[17px]">
                Vous pouvez tous les deux aimer Dieu et pourtant avoir des visions très différentes de la vie. AGAPEO regarde plus loin pour faire
                ressortir les profils avec lesquels tu pourrais partager bien plus qu’une attirance.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <ul className="mt-7 grid grid-cols-2 gap-2 sm:mt-8">
                {QUESTIONS.map((q) => (
                  <li key={q.t} className="rounded-[18px] bg-white/70 p-3.5 sm:rounded-[20px] sm:p-4">
                    <p className="text-[13.5px] leading-snug font-semibold sm:text-[14.5px]">{q.t}</p>
                    <p className="mt-1 text-[12.5px] leading-snug text-ink/60 sm:text-[13.5px]">{q.q}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.2} className="mt-8">
              <Button href={LINKS.register} variant="dark">Découvrir mes compatibilités</Button>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div ref={ref} className="rounded-[32px] bg-white p-4 shadow-[0_40px_90px_-50px_rgb(204_28_84/0.5)] sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center">
                  {PEOPLE.map((p, i) => (
                    <img
                      key={p.name}
                      src={p.img}
                      alt=""
                      className={cn('size-12 rounded-full object-cover ring-4 ring-white sm:size-14', i > 0 && '-ml-3')}
                      style={{ objectPosition: p.pos }}
                    />
                  ))}
                  <span className="z-10 -ml-3 grid size-8 place-items-center rounded-full bg-rose text-white ring-4 ring-white">
                    <Icon icon={FavouriteIcon} size={13} strokeWidth={2.4} />
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">Compatibilité</p>
                  <p className="font-urbanist text-[30px] leading-none font-semibold text-rose sm:text-[36px]">92 %</p>
                </div>
              </div>

              <div className="mx-auto mt-2 aspect-square w-full max-w-[440px]" style={CHART_VARS}>
                {inView && (
                  <RadarChart data={DATA} metrics={METRICS} margin={56} levels={4} hoveredIndex={hovered} onHoverChange={setHovered}>
                    <RadarGrid showLabels={false} />
                    <RadarAxis />
                    <RadarLabels fontSize={12} offset={20} />
                    {DATA.map((d, i) => (
                      <RadarArea key={d.label} index={i} showGlow={false} />
                    ))}
                  </RadarChart>
                )}
              </div>

              <div className="mt-1 flex justify-center gap-2">
                {DATA.map((d, i) => (
                  <button
                    key={d.label}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 transition-colors',
                      hovered === i ? 'bg-paper ring-ink/20' : 'ring-line',
                    )}
                  >
                    <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
