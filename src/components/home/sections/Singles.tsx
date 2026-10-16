'use client'

import { motion } from 'motion/react'
import { useState } from 'react'
import { CheckmarkBadge01Icon, Location01Icon } from '@hugeicons/core-free-icons'
import { Button, Eyebrow, Icon, LINKS, Reveal } from '../lib/ui'
import { HeartGlyph } from '../components/HeartBurst'
import Stack from '../components/Stack'

const PEOPLE = [
  { name: 'Sarah, 27', city: 'Abidjan, Côte d’Ivoire', img: '/images/home/sarah.jpg', pos: '50% 22%', tags: ['Évangélique', 'Mariage chrétien'] },
  { name: 'Emmanuel, 26', city: 'Lomé, Togo', img: '/images/home/emmanuel.jpg', pos: '50% 30%', tags: ['Protestant', 'Fidélité'] },
  { name: 'Grâce, 28', city: 'Cotonou, Bénin', img: '/images/home/grace.jpg', pos: '40% 40%', tags: ['Prière', 'Fonder une famille'] },
  { name: 'Samuel, 25', city: 'Dakar, Sénégal', img: '/images/home/samuel.jpg', pos: '28% 30%', tags: ['Vie d’église', 'Relation sérieuse'] },
  { name: 'Léa, 25', city: 'Bamako, Mali', img: '/images/home/lea.jpg', pos: '50% 25%', tags: ['Louange', 'Service aux autres'] },
  { name: 'David, 29', city: 'Douala, Cameroun', img: '/images/home/david.jpg', pos: '58% 30%', tags: ['Évangélique', 'Projets communs'] },
]

function PersonCard({ p }: { p: (typeof PEOPLE)[number] }) {
  return (
    <div className="relative size-full bg-ink">
      <img src={p.img} alt={p.name} draggable={false} style={{ objectPosition: p.pos }} />
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
      <span className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-semibold text-ink backdrop-blur">
        <span className="size-1.5 rounded-full bg-emerald-500" /> En ligne
      </span>
      <div className="absolute inset-x-5 bottom-5 text-left text-white">
        <p className="flex items-center gap-1.5 font-urbanist text-[26px] leading-none font-semibold">
          {p.name} <Icon icon={CheckmarkBadge01Icon} size={20} className="text-rose-soft" />
        </p>
        <p className="mt-1.5 flex items-center gap-1 text-[13px] text-white/75">
          <Icon icon={Location01Icon} size={13} /> {p.city}
        </p>
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {p.tags.map((t) => (
            <span key={t} className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold ring-1 ring-white/25 backdrop-blur-md">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Singles({ id = 'decouvrir' }: { id?: string } = {}) {
  const [top, setTop] = useState(0)

  return (
    <section id={id} className="scroll-mt-24 overflow-hidden px-4 pb-20 sm:px-5 sm:pb-32">
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        {/* Pile de profils à faire glisser */}
        <Reveal className="order-2 lg:order-1">
          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="relative mx-auto h-[420px] w-[290px] pt-8 sm:h-[520px] sm:w-[350px] sm:pt-10">
              <Stack
                cards={PEOPLE.map((p) => (
                  <PersonCard key={p.name} p={p} />
                ))}
                layout="fan"
                visible={4}
                spread={0.7}
                radius={30}
                frame={6}
                frameColor="#ffffff"
                sendToBackOnClick
                autoplay
                autoplayDelay={3400}
                pauseOnHover
                onChange={setTop}
                className="!h-[380px] sm:!h-[460px]"
              />
            </div>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="glass absolute top-[30%] right-0 z-30 hidden items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-[13px] font-semibold text-ink sm:flex"
            >
              <span className="grid size-7 place-items-center rounded-full bg-rose text-white">
                <HeartGlyph className="size-3.5" />
              </span>
              92 % de points communs
            </motion.div>
            <p className="relative mt-4 text-center text-[13px] font-medium text-ink/50">
              <span className="text-ink">{String(top + 1).padStart(2, '0')}</span> / {String(PEOPLE.length).padStart(2, '0')} · Glisse ou touche
              une carte
            </p>
          </div>
        </Reveal>

        {/* Texte */}
        <div className="order-1 lg:order-2">
          <Reveal>
            <Eyebrow>Découvrir</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
              Des célibataires qui partagent <span className="title-accent whitespace-nowrap">ta foi.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-[500px] text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">
              Pas besoin de mettre ta foi de côté pour trouver quelqu’un. <span className="text-ink">Ici, elle fait partie de la rencontre dès le départ.</span>
            </p>
          </Reveal>
          <Reveal delay={0.2} className="mt-9">
            <Button href={LINKS.register}>Découvrir les profils</Button>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
