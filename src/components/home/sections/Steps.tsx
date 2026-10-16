'use client'

import { motion, useScroll } from 'motion/react'
import { useRef } from 'react'
import { UserEdit01Icon, Search01Icon, Chatting01Icon, Plant02Icon } from '@hugeicons/core-free-icons'
import { Button, Eyebrow, Icon, LINKS, Reveal } from '../lib/ui'
import HeartImage from '../components/HeartImage'

const STEPS = [
  { n: '01', icon: UserEdit01Icon, t: 'Présente qui tu es vraiment', d: 'Parle de toi, de tes passions, de ton parcours avec Dieu, de tes valeurs et de la personne que tu aimerais rencontrer.' },
  { n: '02', icon: Search01Icon, t: 'Découvre des célibataires', d: 'Explore des profils qui correspondent à tes préférences, tes convictions et ta manière d’envisager une relation.' },
  { n: '03', icon: Chatting01Icon, t: 'Fais connaissance', d: 'Une personne retient ton attention ? Découvre vos points communs et engage une conversation sincère.' },
  { n: '04', icon: Plant02Icon, t: 'Avance avec intention', d: 'Prenez le temps de vous découvrir, de prier, de parler de vos projets et de discerner si vos chemins continuent ensemble.' },
]

export default function Steps() {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.7', 'end 0.6'] })

  return (
    <section id="comment-ca-marche" className="scroll-mt-24 px-5 py-20 sm:py-32">
      <div className="mx-auto grid max-w-[1240px] gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Reveal>
            <Eyebrow>Une rencontre peut commencer ici</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
              Fais le premier pas. <span className="title-accent">Laisse Dieu écrire la suite.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.15} className="mt-8 hidden lg:block">
            <Button href={LINKS.register}>Créer mon profil</Button>
          </Reveal>
          <Reveal delay={0.2} className="mt-12 hidden lg:block">
            <HeartImage src="/images/home/couple-reading.jpg" alt="Un couple qui partage un moment de lecture" position="55% 30%" className="w-full max-w-[380px]" />
          </Reveal>
        </div>

        <ol ref={ref} className="relative flex flex-col">
          {/* ligne de progression */}
          <span className="absolute top-2 bottom-2 left-[27px] w-px bg-line" aria-hidden />
          <motion.span
            style={{ scaleY: scrollYProgress }}
            className="absolute top-2 bottom-2 left-[27px] w-px origin-top bg-rose"
            aria-hidden
          />
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05} className="relative flex gap-5 pb-12 last:pb-0 sm:gap-10 sm:pb-14">
              <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-full bg-paper ring-1 ring-line">
                <span className="grid size-10 place-items-center rounded-full bg-rose text-white">
                  <Icon icon={s.icon} size={20} />
                </span>
              </span>
              <div className="pt-1">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-rose">Étape {s.n}</span>
                <h3 className="mt-2 font-urbanist text-[clamp(23px,2.6vw,34px)] leading-[1.15] font-semibold">{s.t}</h3>
                <p className="mt-2.5 max-w-[460px] text-[15px] leading-relaxed text-ink-muted sm:text-[16px]">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </ol>

        <Reveal className="flex flex-col items-center gap-12 lg:hidden">
          <Button href={LINKS.register} full>Créer mon profil</Button>
          <HeartImage src="/images/home/couple-reading.jpg" alt="Un couple qui partage un moment de lecture" position="55% 30%" className="w-full max-w-[300px]" />
        </Reveal>
      </div>
    </section>
  )
}
