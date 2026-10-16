'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu01Icon, Cancel01Icon, ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { Icon, LINKS, cn, EASE, Button } from '../lib/ui'

export type NavLink = { label: string; href: string }

const NAV: NavLink[] = [
  { label: 'Découvrir', href: '#decouvrir' },
  { label: 'Comment ça marche', href: '#comment-ca-marche' },
  { label: 'Tarifs', href: '#tarifs' },
  { label: 'Témoignages', href: '#temoignages' },
]

export function Logo({ light = false, compact = false, className }: { light?: boolean; compact?: boolean; className?: string }) {
  return (
    <a href="#top" className={cn('flex items-center gap-2.5', className)} aria-label="AGAPEO — accueil">
      <img src="/images/home/logo.png" alt="" className={cn('object-contain transition-all duration-500 ease-out-soft', compact ? 'size-7' : 'size-9')} />
      <span
        className={cn(
          'font-urbanist font-semibold tracking-[-0.03em] transition-all duration-500 ease-out-soft',
          compact ? 'text-[19px]' : 'text-[22px]',
          light ? 'text-white' : 'text-ink',
        )}
      >
        AGAPEO
      </span>
    </a>
  )
}

export default function Navbar({ links = NAV, announce = true }: { links?: NavLink[]; announce?: boolean } = {}) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <>
      {/* Barre d'annonce */}
      {announce && (
      <a
        href={LINKS.playStore}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-center gap-2 bg-ink px-4 py-2.5 text-center text-[13px] text-white/80"
      >
        <span className="size-1.5 shrink-0 rounded-full bg-rose" />
        <span>
          <span className="hidden sm:inline">AGAPEO est disponible sur Google Play — </span>
          <span className="sm:hidden">Disponible sur Google Play — </span>
          <span className="font-semibold text-white underline-offset-4 group-hover:underline">Télécharger</span>
          <span className="hidden font-semibold text-white sm:inline"> maintenant</span>
        </span>
        <Icon icon={ArrowUpRight01Icon} size={14} className="text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>
      )}

      {/* Hauteur fixe : le menu se réduit à l'intérieur sans faire sauter la page.
          Au départ il flotte sur le panneau du hero, à 20 px de ses bords (12 px de marge du panneau + 20 px). */}
      <header className="pointer-events-none sticky top-0 z-50 h-[92px] sm:h-[100px]">
        <div
          className={cn(
            'pointer-events-auto absolute inset-x-0 top-0 transition-all duration-500 ease-out-soft',
            scrolled ? 'px-3 pt-2 sm:px-8 sm:pt-3' : 'px-8 pt-8 sm:px-10 sm:pt-10',
          )}
        >
        <div
          className={cn(
            'mx-auto flex items-center justify-between rounded-full ring-1 backdrop-blur-xl transition-all duration-500 ease-out-soft',
            scrolled
              ? 'max-w-[980px] bg-white/80 py-1.5 pr-1.5 pl-4 shadow-[0_12px_32px_-16px_rgb(14_19_27/0.25)] ring-white/70'
              : 'max-w-[1240px] bg-white/45 py-2 pr-2 pl-4 shadow-[0_10px_30px_-18px_rgb(204_28_84/0.35)] ring-white/70 sm:pl-5',
          )}
        >
          <Logo compact={scrolled} />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
            {links.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={cn(
                  'rounded-full py-2 font-medium text-ink/70 transition-all duration-500 hover:bg-blush hover:text-ink',
                  scrolled ? 'px-3 text-[13.5px]' : 'px-4 text-[14px]',
                )}
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href={LINKS.login} className={cn('hidden py-2 text-[14px] font-semibold text-ink/80 transition-all duration-500 hover:text-ink sm:block', scrolled ? 'px-2.5' : 'px-4')}>
              Se connecter
            </a>
            <a
              href={LINKS.register}
              className={cn(
                'hidden items-center rounded-full bg-rose text-[14px] font-semibold text-white transition-all duration-500 hover:bg-rose-deep sm:inline-flex',
                scrolled ? 'h-10 px-4' : 'h-11 px-5',
              )}
            >
              Rejoindre AGAPEO
            </a>
            <button
              onClick={() => setOpen(true)}
              className={cn('grid place-items-center rounded-full bg-ink text-white transition-all duration-500 lg:hidden', scrolled ? 'size-10' : 'size-11')}
              aria-label="Ouvrir le menu"
            >
              <Icon icon={Menu01Icon} size={20} />
            </button>
          </div>
        </div>
        </div>
      </header>

      {/* Menu mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            data-lenis-prevent
            className="fixed inset-0 z-[60] flex flex-col bg-ink px-6 pt-6 pb-10 text-white"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="flex items-center justify-between">
              <Logo light />
              <button onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full bg-white/10" aria-label="Fermer le menu">
                <Icon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <nav className="mt-14 flex flex-col">
              {links.map((n, i) => (
                <motion.a
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.06, duration: 0.6, ease: EASE }}
                  className="border-b border-white/10 py-5 font-urbanist text-[34px] leading-none"
                >
                  {n.label}
                </motion.a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              <Button href={LINKS.register} full>Rejoindre AGAPEO</Button>
              <a href={LINKS.login} className="py-3 text-center text-[15px] font-semibold text-white/70">Se connecter</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
