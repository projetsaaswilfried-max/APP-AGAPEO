'use client'

import BlurText from '../components/BlurText'
import { QuoteDownIcon } from '@hugeicons/core-free-icons'
import { Button, Icon, LINKS, Reveal } from '../lib/ui'

const MEMBERS = ['deborah', 'samuel', 'grace', 'emmanuel', 'lea']

export default function FinalCta() {
  return (
    <section className="px-3 pt-24 sm:px-5 sm:pt-36">
      <div className="relative mx-auto max-w-[1240px]">
        {/* Verset */}
        <div className="mx-auto max-w-[900px] px-2 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-[20px] bg-blush text-rose">
            <Icon icon={QuoteDownIcon} size={26} />
          </span>
          <BlurText
            text="Et par-dessus toutes ces choses, revêtez-vous de l’amour, qui est le lien de la perfection."
            delay={70}
            animateBy="words"
            direction="bottom"
            className="mt-8 justify-center font-urbanist text-[clamp(24px,3.4vw,44px)] leading-[1.22] font-medium"
          />
          <Reveal delay={0.3}>
            <p className="mt-7 flex items-center justify-center gap-4 text-[12.5px] font-semibold uppercase tracking-[0.22em] text-rose">
              <span className="h-px w-10 bg-rose/40" />
              Colossiens 3:14
              <span className="h-px w-10 bg-rose/40" />
            </p>
          </Reveal>
        </div>

        {/* Appel final : les deux regards se croisent autour du message */}
        <div className="relative mt-16 overflow-hidden rounded-[32px] bg-white px-5 pt-14 ring-1 ring-line sm:mt-24 sm:rounded-[40px] sm:px-10 sm:pt-20">
          <div className="relative z-10 mx-auto max-w-[620px] text-center lg:max-w-[520px]">
            <Reveal className="mb-7 flex justify-center">
              <span className="inline-flex items-center gap-3 rounded-full bg-paper py-1.5 pr-4 pl-1.5 ring-1 ring-line">
                <span className="flex -space-x-2">
                  {MEMBERS.map((m) => (
                    <img key={m} src={`/images/home/${m}.jpg`} alt="" className="size-8 rounded-full object-cover object-top ring-2 ring-paper" />
                  ))}
                </span>
                <span className="text-[13px] font-semibold text-ink/75">Rejoins la communauté</span>
              </span>
            </Reveal>
            <Reveal>
              <h2 className="font-urbanist text-[clamp(26px,4vw,54px)] leading-[1.06] font-medium">
                Tout commence par <span className="title-accent whitespace-nowrap">une rencontre.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="mx-auto mt-6 max-w-[460px] text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">
                L’amour que tu souhaites construire commence peut-être ici. Une personne, une conversation, une foi partagée. Et deux chemins qui commencent peut-être à n’en former qu’un.
              </p>
            </Reveal>
            <Reveal delay={0.14} className="mt-9 flex justify-center">
              <Button href={LINKS.register}>Créer mon profil gratuitement</Button>
            </Reveal>
          </div>

          <Reveal delay={0.1} y={40} className="pointer-events-none -mx-5 mt-8 overflow-hidden sm:-mx-10 lg:absolute lg:inset-x-0 lg:bottom-0 lg:mx-0 lg:mt-0">
            <img
              src="/images/home/couple-split.png"
              alt="Une femme et un homme qui se regardent en souriant"
              className="relative left-1/2 block w-[118%] max-w-none -translate-x-1/2 select-none sm:w-full sm:max-w-[1240px]"
            />
          </Reveal>
          <div className="hidden h-[230px] lg:block" />
        </div>
      </div>
    </section>
  )
}
