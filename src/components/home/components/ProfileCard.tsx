'use client'

import { CheckmarkBadge01Icon, Location01Icon, BookOpen01Icon, FavouriteIcon } from '@hugeicons/core-free-icons'
import { Icon } from '../lib/ui'

export type Profile = {
  name: string
  city: string
  img: string
  pos: string
  faith: string[]
  values: string[]
}

export const PROFILES: Profile[] = [
  {
    name: 'Sarah, 27',
    city: 'Abidjan, Côte d’Ivoire',
    img: '/images/home/sarah.jpg',
    pos: '50% 20%',
    faith: ['Évangélique', 'Impliquée à l’église', 'Lecture quotidienne'],
    values: ['Mariage chrétien', 'Fonder une famille', 'Service aux autres'],
  },
  {
    name: 'Emmanuel, 26',
    city: 'Lomé, Togo',
    img: '/images/home/emmanuel.jpg',
    pos: '50% 30%',
    faith: ['Protestant', 'Chantre à l’église', 'Prière quotidienne'],
    values: ['Mariage chrétien', 'Fidélité', 'Projets communs'],
  },
]

export function ProfileCard({ p, shape = 'card' }: { p: Profile; shape?: 'card' | 'arch' | 'soft' }) {
  const groups = [
    { icon: BookOpen01Icon, title: 'La foi au quotidien', tags: p.faith },
    { icon: FavouriteIcon, title: 'Vision & Valeurs', tags: p.values },
  ]
  return (
    <div className={`w-full bg-white p-3 shadow-[0_50px_90px_-40px_rgb(14_19_27/0.35)] ring-1 ring-line ${shape === 'arch' ? 'rounded-t-[999px] rounded-b-[30px]' : 'rounded-[30px]'}`}>
      <div className={`relative aspect-[4/3.9] overflow-hidden bg-[#f4f2f1] ${shape === 'arch' ? 'rounded-t-[999px] rounded-b-[20px]' : shape === 'soft' ? 'rounded-[30px]' : 'arch'}`}>
        <img src={p.img} alt={`${p.name}, membre d’AGAPEO`} draggable={false} className="size-full object-cover" style={{ objectPosition: p.pos }} />
        <span className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-ink backdrop-blur">
          <span className="size-2 rounded-full bg-emerald-500" /> En ligne
        </span>
      </div>
      <div className="px-2.5 pt-5 pb-2 sm:px-3">
        <h3 className="flex items-center gap-2 font-urbanist text-[26px] leading-none font-semibold sm:text-[28px]">
          {p.name}
          <Icon icon={CheckmarkBadge01Icon} size={22} className="text-rose" />
        </h3>
        <p className="mt-2 flex items-center gap-1.5 text-[14px] text-ink-muted">
          <Icon icon={Location01Icon} size={15} /> {p.city}
        </p>
        <div className="mt-5 flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">
                <Icon icon={g.icon} size={13} /> {g.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {g.tags.map((t) => (
                  <span key={t} className="rounded-full bg-blush px-3 py-1.5 text-[12.5px] font-semibold text-rose-deep">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
