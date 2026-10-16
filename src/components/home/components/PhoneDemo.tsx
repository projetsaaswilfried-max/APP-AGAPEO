'use client'

import { AnimatePresence, motion, useInView } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft01Icon,
  CallIcon,
  Cancel01Icon,
  CheckmarkBadge01Icon,
  FavouriteIcon,
  HeartHandshakeIcon,
  Location01Icon,
  Message01Icon,
  Mic01Icon,
  Notification01Icon,
} from '@hugeicons/core-free-icons'
import { Icon, cn, EASE } from '../lib/ui'
import { HeartGlyph } from './HeartBurst'

/* ─── Scénario de l'animation ─── */
const SCENES = ['discover', 'profile', 'match', 'chat', 'together'] as const
const DURATIONS = [2900, 3600, 3000, 4600, 3400]
const STEP_OF_SCENE = [0, 0, 1, 2, 3]
const FIRST_SCENE_OF_STEP = [0, 2, 3, 4]
export const STEPS = ['Ajoute', 'Matchez', 'Discutez', 'Partenaires']

/* Écran du mockup : un masque généré depuis la transparence de l'image (forme exacte, coins arrondis compris)
   + la boîte englobante de l'écran mesurée sur l'image 365 × 750. */
const SCREEN_MASK = {
  WebkitMaskImage: 'url(/images/home/iphone-screen-mask.png)',
  maskImage: 'url(/images/home/iphone-screen-mask.png)',
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
} as const
const SCREEN_BOX = { left: '3.56%', right: '3.56%', top: '1.33%', bottom: '1.33%' }

/** Doigt qui touche l'écran */
function Tap({ x, y, at }: { x: string; y: string; at: number }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute z-30 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45 ring-2 ring-white shadow-[0_6px_18px_-4px_rgb(14_19_27/0.45)] backdrop-blur-sm"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 1.7 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [1.7, 1, 0.78, 1.4] }}
      transition={{ duration: 1, delay: at, times: [0, 0.45, 0.62, 1], ease: 'easeOut' }}
    />
  )
}

function StatusBar({ light }: { light: boolean }) {
  return (
    <div className={cn('absolute inset-x-0 top-0 z-20 flex h-[46px] items-center justify-between px-[26px] pt-1 text-[13px] font-semibold', light ? 'text-white' : 'text-ink')}>
      <span>9:41</span>
      <span className="flex items-center gap-1" aria-hidden>
        <span className="flex items-end gap-[2px]">
          {[4, 6, 8, 10].map((h) => (
            <span key={h} className="w-[3px] rounded-[1px] bg-current" style={{ height: h }} />
          ))}
        </span>
        <span className="ml-1 h-[10px] w-[20px] rounded-[3px] border border-current p-[1.5px]">
          <span className="block h-full w-[70%] rounded-[1px] bg-current" />
        </span>
      </span>
    </div>
  )
}

function Tag({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[10.5px] font-semibold', light ? 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md' : 'bg-blush text-rose-deep')}>
      {children}
    </span>
  )
}

/* ─── 1. Découvrir ─── */
function Discover() {
  return (
    <div className="relative flex h-full flex-col bg-white pt-[50px]">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/images/home/logo.png" alt="" className="size-6 object-contain" />
          <span className="font-urbanist text-[19px] font-semibold tracking-[-0.03em]">Découvrir</span>
        </div>
        <span className="grid size-8 place-items-center rounded-full bg-paper ring-1 ring-line">
          <Icon icon={Notification01Icon} size={15} />
        </span>
      </div>
      <div className="mt-3 flex gap-1.5 px-4">
        {['Pour toi', 'À proximité', 'Nouveaux'].map((t, i) => (
          <span key={t} className={cn('rounded-full px-3 py-1 text-[10.5px] font-semibold', i === 0 ? 'bg-rose text-white' : 'bg-paper text-ink/60 ring-1 ring-line')}>
            {t}
          </span>
        ))}
      </div>

      <motion.div
        className="relative mx-3 mt-3 flex-1 overflow-hidden rounded-[22px] bg-ink"
        animate={{ scale: [1, 1, 0.96, 1] }}
        transition={{ duration: 0.6, delay: 1.7, times: [0, 0.3, 0.6, 1] }}
      >
        <img src="/images/home/sarah.jpg" alt="" className="absolute inset-0 size-full object-cover object-[50%_22%]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/85 to-transparent" />
        <span className="glass absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold text-rose-deep">
          <HeartGlyph className="size-2.5" /> 92 %
        </span>
        <div className="absolute inset-x-3.5 bottom-3.5 text-white">
          <p className="flex items-center gap-1 font-urbanist text-[21px] leading-none font-semibold">
            Sarah, 27 <Icon icon={CheckmarkBadge01Icon} size={15} className="text-rose-soft" />
          </p>
          <p className="mt-1 flex items-center gap-1 text-[10.5px] text-white/75">
            <Icon icon={Location01Icon} size={10} /> Abidjan, Côte d’Ivoire
          </p>
          <div className="mt-2 flex gap-1">
            <Tag light>Évangélique</Tag>
            <Tag light>Mariage chrétien</Tag>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center justify-center gap-4 py-3.5">
        <span className="grid size-11 place-items-center rounded-full bg-white text-ink/50 shadow-[0_8px_20px_-10px_rgb(14_19_27/0.4)] ring-1 ring-line">
          <Icon icon={Cancel01Icon} size={18} />
        </span>
        <span className="grid size-13 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-rose),var(--color-rose-soft))] text-white shadow-[0_10px_24px_-10px_rgb(204_28_84/0.8)]">
          <Icon icon={FavouriteIcon} size={22} strokeWidth={2} />
        </span>
        <span className="grid size-11 place-items-center rounded-full bg-white text-ink/50 shadow-[0_8px_20px_-10px_rgb(14_19_27/0.4)] ring-1 ring-line">
          <Icon icon={Message01Icon} size={18} />
        </span>
      </div>
      <Tap x="50%" y="45%" at={1.4} />
    </div>
  )
}

/* ─── 2. Profil ─── */
function Profile() {
  return (
    <div className="relative h-full bg-white">
      <img src="/images/home/sarah.jpg" alt="" className="absolute inset-x-0 top-0 h-[46%] w-full object-cover object-[50%_20%]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/45 to-transparent" />
      <span className="absolute top-[52px] left-3.5 grid size-8 place-items-center rounded-full bg-white/80 text-ink backdrop-blur">
        <Icon icon={ArrowLeft01Icon} size={16} />
      </span>
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="absolute inset-x-0 top-[40%] bottom-0 flex flex-col rounded-t-[26px] bg-white px-4 pt-4"
      >
        <span className="mx-auto mb-3 h-1 w-9 rounded-full bg-ink/10" />
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1 font-urbanist text-[21px] leading-none font-semibold">
            Sarah, 27 <Icon icon={CheckmarkBadge01Icon} size={15} className="text-rose" />
          </p>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
            <span className="size-1.5 rounded-full bg-emerald-500" /> En ligne
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-[10.5px] text-ink-muted">
          <Icon icon={Location01Icon} size={10} /> Abidjan, Côte d’Ivoire
        </p>

        <div className="mt-3 rounded-[14px] bg-blush px-3 py-2.5">
          <div className="flex items-baseline justify-between text-[10.5px] font-semibold">
            <span>Points communs</span>
            <span className="text-rose">92 %</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white">
            <motion.div className="h-full rounded-full bg-rose" initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ duration: 1.2, ease: EASE, delay: 0.4 }} />
          </div>
        </div>

        <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-ink/40">La foi au quotidien</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Tag>Évangélique</Tag>
          <Tag>Impliquée à l’église</Tag>
        </div>
        <p className="mt-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-ink/40">Vision & valeurs</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Tag>Mariage chrétien</Tag>
          <Tag>Fonder une famille</Tag>
        </div>

        <motion.span
          className="mt-auto mb-5 flex h-10 items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,var(--color-rose),var(--color-rose-soft))] text-[12.5px] font-semibold text-white"
          animate={{ scale: [1, 1, 0.94, 1.04, 1] }}
          transition={{ duration: 0.7, delay: 2.5, times: [0, 0.2, 0.45, 0.75, 1] }}
        >
          <Icon icon={FavouriteIcon} size={15} strokeWidth={2} /> J’aime ce profil
        </motion.span>
      </motion.div>
      <Tap x="50%" y="93.5%" at={2.2} />
    </div>
  )
}

/* ─── 3. Match ─── */
function Match() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-blush px-5 text-center">
      {[
        { l: '18%', t: '22%', d: 0.2 },
        { l: '76%', t: '18%', d: 0.6 },
        { l: '12%', t: '64%', d: 1 },
        { l: '82%', t: '60%', d: 0.4 },
      ].map((h, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute size-3.5 text-rose/60"
          style={{ left: h.l, top: h.t }}
          initial={{ opacity: 0, y: 10, scale: 0 }}
          animate={{ opacity: [0, 1, 0], y: -30, scale: 1 }}
          transition={{ duration: 2, delay: h.d, ease: 'easeOut' }}
        >
          <HeartGlyph className="size-full" />
        </motion.span>
      ))}

      <div className="flex items-center">
        <motion.img
          src="/images/home/david.jpg"
          alt=""
          className="size-[86px] rounded-full object-cover object-[58%_30%] ring-4 ring-white"
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 8, opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE }}
        />
        <motion.img
          src="/images/home/sarah.jpg"
          alt=""
          className="size-[86px] rounded-full object-cover object-[50%_22%] ring-4 ring-white"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: -8, opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE }}
        />
      </div>
      <motion.span
        className="relative z-10 -mt-7 grid size-12 place-items-center rounded-full bg-rose text-white ring-4 ring-white"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.25, 1] }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Icon icon={FavouriteIcon} size={20} strokeWidth={2.2} />
      </motion.span>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-4 font-urbanist text-[28px] leading-none font-bold tracking-[-0.03em] text-rose"
      >
        C’est un match !
      </motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-2 text-[11.5px] leading-snug text-ink/60">
        Sarah et toi partagez 92 % de points communs.
      </motion.p>
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, scale: [1, 1, 0.94, 1] }}
        transition={{ opacity: { delay: 1.1 }, y: { delay: 1.1 }, scale: { duration: 0.6, delay: 2.3, times: [0, 0.2, 0.5, 1] } }}
        className="mt-5 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-rose text-[12.5px] font-semibold text-white"
      >
        <Icon icon={Message01Icon} size={15} /> Envoyer un message
      </motion.span>
      <Tap x="50%" y="66%" at={2} />
    </div>
  )
}

/* ─── 4. Discussion ─── */
const CHAT = [
  { me: true, t: 'Salut Sarah ! On a 92 % de points communs 😊', at: 0.3 },
  { me: false, t: 'Je viens de voir ça ! Tu vis ta foi dans quelle église ?', at: 1.2 },
  { me: true, t: 'Une communauté évangélique, je sers à la louange. Et toi ?', at: 2.2 },
  { me: false, t: 'Pareil ! On pourrait prier ensemble cette semaine 🙏', at: 3.6 },
]

function Chat() {
  return (
    <div className="flex h-full flex-col bg-white pt-[46px]">
      <div className="flex items-center gap-2.5 border-b border-line px-3.5 pb-2.5">
        <Icon icon={ArrowLeft01Icon} size={16} className="text-ink/60" />
        <div className="relative">
          <img src="/images/home/sarah.jpg" alt="" className="size-8 rounded-full object-cover object-[50%_22%]" />
          <span className="absolute right-0 bottom-0 size-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
        <div className="flex-1 leading-tight">
          <p className="text-[12.5px] font-semibold">Sarah</p>
          <p className="text-[10px] text-emerald-600">En ligne</p>
        </div>
        <Icon icon={CallIcon} size={16} className="text-ink/60" />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2 bg-paper px-3 pb-3">
        <p className="mb-1 self-center rounded-full bg-white px-2.5 py-0.5 text-[9.5px] font-semibold text-ink/40 ring-1 ring-line">Nouveau match</p>
        {CHAT.map((m) => (
          <motion.p
            key={m.t}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: EASE, delay: m.at }}
            className={cn(
              'max-w-[80%] rounded-[16px] px-3 py-2 text-[11.5px] leading-snug',
              m.me ? 'self-end rounded-br-[6px] bg-rose text-white' : 'self-start rounded-bl-[6px] bg-white text-ink ring-1 ring-line',
            )}
          >
            {m.t}
          </motion.p>
        ))}
        {/* « en train d'écrire » */}
        <motion.span
          className="flex w-fit gap-1 self-start rounded-full bg-white px-3 py-2.5 ring-1 ring-line"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.2, delay: 2.6, times: [0, 0.1, 0.85, 1] }}
        >
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="size-1.5 rounded-full bg-ink/40"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.15 }}
            />
          ))}
        </motion.span>
      </div>
      <div className="flex items-center gap-2 border-t border-line px-3 pt-2.5 pb-5">
        <span className="flex-1 rounded-full bg-paper px-3.5 py-2 text-[11px] text-ink/40 ring-1 ring-line">Message…</span>
        <span className="grid size-8 place-items-center rounded-full bg-rose text-white">
          <Icon icon={Mic01Icon} size={14} />
        </span>
      </div>
    </div>
  )
}

/* ─── 5. Partenaires ─── */
const COUPLES = [
  { src: '/images/home/pexels-couple-1.jpg', pos: '50% 25%' },
  { src: '/images/home/pexels-couple-2.jpg', pos: '50% 30%' },
  { src: '/images/home/pexels-couple-3.jpg', pos: '55% 40%' },
]

function Together({ loop = 0 }: { loop?: number }) {
  const couple = COUPLES[loop % COUPLES.length]
  return (
    <div className="relative h-full bg-ink">
      <motion.img
        src={couple.src}
        alt=""
        className="absolute inset-0 size-full object-cover"
        style={{ objectPosition: couple.pos }}
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 3.4, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink/70" />
      <motion.span
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="glass absolute top-[56px] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap text-rose-deep"
      >
        <Icon icon={HeartHandshakeIcon} size={13} /> Partenaires
      </motion.span>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8, ease: EASE }}
        className="glass absolute inset-x-3 bottom-5 rounded-[20px] p-3.5"
      >
        <p className="flex items-center gap-1.5 font-urbanist text-[18px] leading-tight font-semibold text-ink">
          <HeartGlyph className="size-4 text-rose" /> Vous avancez ensemble
        </p>
        <p className="mt-1 text-[10.5px] leading-snug text-ink/65">
          Prenez le temps de vous découvrir, de prier et de parler de vos projets.
        </p>
      </motion.div>
    </div>
  )
}

const RENDER = { discover: Discover, profile: Profile, match: Match, chat: Chat, together: Together }
const LIGHT_STATUS = { discover: false, profile: true, match: false, chat: false, together: true }

/* ─── Téléphone + puces en verre + barre d'étapes ─── */
export default function PhoneDemo() {
  const [scene, setScene] = useState(0)
  const [loop, setLoop] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.25 })

  useEffect(() => {
    if (!inView) return
    const t = setTimeout(() => {
      if (scene === SCENES.length - 1) setLoop((l) => l + 1)
      setScene((v) => (v + 1) % SCENES.length)
    }, DURATIONS[scene])
    return () => clearTimeout(t)
  }, [scene, inView])

  const key = SCENES[scene]
  const Scene = RENDER[key]
  const step = STEP_OF_SCENE[scene]

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[600px]">
      <div className="relative mx-auto w-[300px] sm:w-[320px]" style={{ aspectRatio: '365 / 750' }}>
        <div className="absolute inset-0" style={SCREEN_MASK}>
          <div className="absolute overflow-hidden bg-white" style={SCREEN_BOX}>
          <StatusBar light={LIGHT_STATUS[key]} />
          <AnimatePresence initial={false}>
            <motion.div
              key={scene}
              className="absolute inset-0"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              {key === 'together' ? <Together loop={loop} /> : <Scene />}
            </motion.div>
          </AnimatePresence>
          </div>
        </div>
        <img src="/images/home/iphone-mockup.png" alt="" aria-hidden className="pointer-events-none absolute inset-0 size-full select-none drop-shadow-[0_40px_50px_rgb(14_19_27/0.22)]" />
      </div>

      {/* puces en verre */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="glass absolute top-[14%] right-[calc(50%+128px)] z-10 hidden items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-[13px] font-semibold whitespace-nowrap text-ink sm:max-lg:flex xl:flex"
      >
        <span className="grid size-7 place-items-center rounded-full bg-rose text-white">
          <Icon icon={CheckmarkBadge01Icon} size={14} />
        </span>
        Profil vérifié
      </motion.div>
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="glass absolute top-[34%] left-[calc(50%+128px)] z-10 hidden items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-[13px] font-semibold whitespace-nowrap text-ink sm:max-lg:flex xl:flex"
      >
        <span className="grid size-7 place-items-center rounded-full bg-blush text-rose">
          <HeartGlyph className="size-3.5" />
        </span>
        92 % de points communs
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0], scale: step === 1 ? 1.08 : 1 }}
        transition={{ y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }, scale: { type: 'spring', stiffness: 300, damping: 18 } }}
        className="glass absolute top-[56%] right-[calc(50%+128px)] z-10 hidden items-center gap-2.5 rounded-[20px] py-2 pr-4 pl-2 whitespace-nowrap sm:max-lg:flex xl:flex"
      >
        <span className="flex">
          <img src="/images/home/david.jpg" alt="" className="size-8 rounded-full object-cover object-[58%_30%] ring-2 ring-white" />
          <img src="/images/home/sarah.jpg" alt="" className="-ml-2.5 size-8 rounded-full object-cover object-[50%_22%] ring-2 ring-white" />
        </span>
        <span className="leading-tight">
          <span className="block text-[13px] font-bold text-rose">C’est un match !</span>
          <span className="block text-[11px] text-ink/60">Il y a 2 min</span>
        </span>
      </motion.div>

      {/* étapes */}
      <div className="glass relative z-10 mx-auto mt-6 flex w-full max-w-[420px] gap-1 rounded-full p-1.5" role="tablist" aria-label="Comment ça marche">
        {STEPS.map((t, i) => {
          const on = i === step
          return (
            <button
              key={t}
              role="tab"
              aria-selected={on}
              onClick={() => setScene(FIRST_SCENE_OF_STEP[i])}
              className={cn('relative flex-1 rounded-full px-1 py-2 text-[11.5px] font-semibold transition-colors sm:text-[12.5px]', on ? 'text-white' : 'text-ink/55 hover:text-ink')}
            >
              {on && <motion.span layoutId="phone-step" className="absolute inset-0 rounded-full bg-rose" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              <span className="relative whitespace-nowrap">
                <span className="hidden sm:inline">{i + 1}. </span>
                {t}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
