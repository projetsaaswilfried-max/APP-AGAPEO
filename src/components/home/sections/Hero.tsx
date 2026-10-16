'use client'

import { motion } from 'motion/react'
import { Tick02Icon } from '@hugeicons/core-free-icons'
import { Button, Icon, LINKS, EASE } from '../lib/ui'
import LoveTile from '../components/LoveTile'
import HeartBurst from '../components/HeartBurst'
import PhoneDemo from '../components/PhoneDemo'
import MeshGradient from '../components/backgrounds/MeshGradient'

export default function Hero() {
  let w = 0
  const words = (t: string, accent = false) =>
    t.split(' ').map((word, k) => {
      const d = 0.15 + w++ * 0.06
      return (
        <span key={`${t}-${k}`} className="inline-block overflow-hidden pb-[0.08em] align-top">
          <motion.span
            className={accent ? 'title-accent inline-block' : 'inline-block'}
            initial={{ y: '105%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: d }}
          >
            {word}
          </motion.span>
          &nbsp;
        </span>
      )
    })

  return (
    /* Panneau arrondi : il démarre sous le menu (qui flotte dessus en verre, à 20 px des bords). */
    <section
      id="top"
      className="relative isolate mx-3 -mt-[80px] overflow-hidden rounded-[28px] bg-white px-4 pt-[124px] pb-20 sm:mx-5 sm:rounded-[40px] sm:px-5 sm:pt-[150px] lg:pb-28"
    >
      {/* Fond : dégradé maillé rose (21st.dev · Mesh Gradient Shader) qui descend vers le blanc */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_0%,rgb(0_0_0/0.75)_35%,transparent_88%)]">
        <MeshGradient speed={3} intensity={1} grain={0.3} />
      </div>

      <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        {/* Texte */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-blush px-3.5 py-2 text-[11.5px] font-semibold text-rose-deep min-[380px]:whitespace-nowrap sm:mb-7 sm:py-1.5 sm:pr-4 sm:pl-1.5 sm:text-[13px]"
          >
            <span className="hidden size-6 place-items-center rounded-full bg-white sm:grid">
              <img src="/images/home/logo.png" alt="" className="size-4 object-contain" />
            </span>
            L’application de rencontre pensée pour les chrétiens
          </motion.div>

          <h1 className="font-urbanist text-[clamp(35px,6vw,86px)] leading-[1.04] font-medium tracking-[-0.045em] text-ink">
            {words('Rencontre')}
            <LoveTile delay={0.3} />
            {words('quelqu’un qui partage')}
            {words('ta foi.', true)}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.7 }}
            className="mx-auto mt-7 max-w-[520px] text-[16px] leading-relaxed text-ink-muted sm:text-[18px] lg:mx-0"
          >
            Tes valeurs, ta vision de l’amour, ta relation avec Dieu. Rencontre des célibataires chrétiens qui désirent construire une relation
            sincère, avec Christ au centre.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.85 }}
            className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:flex-col lg:items-start xl:flex-row xl:items-center xl:justify-start"
          >
            <HeartBurst className="w-full max-w-[340px] sm:w-auto">
              <Button href={LINKS.register} className="w-full !justify-between sm:w-auto">
                Créer mon profil gratuitement
              </Button>
            </HeartBurst>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.05 }}
            className="mt-10 flex flex-col items-center gap-4 border-t border-line pt-7 sm:flex-row sm:justify-center lg:justify-start"
          >
            <div className="flex -space-x-2.5">
              {['deborah', 'samuel', 'grace', 'emmanuel', 'lea'].map((m) => (
                <img key={m} src={`/images/home/${m}.jpg`} alt="" className="size-10 rounded-full object-cover object-top ring-3 ring-white" />
              ))}
            </div>
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[14px] font-medium text-ink/70 lg:justify-start">
              {['Profils vérifiés', 'Célibataires chrétiens'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Icon icon={Tick02Icon} size={14} strokeWidth={2.6} className="text-rose" /> {t}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Téléphone : comment ça marche, en animation */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
        >
          <PhoneDemo />
        </motion.div>
      </div>
    </section>
  )
}
