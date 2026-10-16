'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { AddSquareIcon, Cancel01Icon, CursorMagicSelection03Icon, Share03Icon } from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { Icon, cn, EASE } from '../lib/ui'
import { HOME_ROOT_CLASS } from '../fonts'

type Device = 'ios' | 'mac'

const STEPS: Record<Device, { title: string; steps: { icon: IconSvgElement; text: string }[] }> = {
  ios: {
    title: 'Installer sur iPhone / iPad',
    steps: [
      { icon: Share03Icon, text: 'Appuie sur l’icône Partager de ton navigateur (Safari, Chrome, ou autre).' },
      { icon: AddSquareIcon, text: 'Choisis « Sur l’écran d’accueil » dans la liste (fais défiler si besoin).' },
      { icon: CursorMagicSelection03Icon, text: 'Confirme en appuyant sur « Ajouter ».' },
    ],
  },
  mac: {
    title: 'Installer sur Mac',
    steps: [
      { icon: Share03Icon, text: 'Dans Safari, clique sur l’icône Partager (ou ouvre le menu Fichier).' },
      { icon: AddSquareIcon, text: 'Choisis « Ajouter au Dock » dans la liste.' },
      { icon: CursorMagicSelection03Icon, text: 'Confirme en cliquant sur « Ajouter ».' },
    ],
  },
}

/** iPhone / iPad (iPadOS se présente comme un Mac, mais avec un écran tactile) → instructions iOS ; sinon Mac. */
function detectDevice(): Device {
  if (typeof navigator === 'undefined') return 'ios'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return 'ios'
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'ios'
  if (/Macintosh/.test(ua)) return 'mac'
  return window.matchMedia('(pointer: coarse)').matches ? 'ios' : 'mac'
}

/** Fenêtre d'aide pour installer AGAPEO depuis le navigateur (iPhone, iPad ou Mac). */
export default function InstallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [device, setDevice] = useState<Device>('ios')
  // Le portail vise document.body, inexistant pendant le rendu serveur (Next) : on attend le montage.
  const [mounted, setMounted] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    setDevice(detectDevice())
    const previous = document.activeElement as HTMLElement | null
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    const t = setTimeout(() => closeRef.current?.focus(), 50)
    return () => {
      clearTimeout(t)
      html.style.overflow = prevOverflow
      previous?.focus()
    }
  }, [open])

  // Échap ferme, Tab reste dans la fenêtre
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !cardRef.current) return
    const items = cardRef.current.querySelectorAll<HTMLElement>('button, [href]')
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const content = STEPS[device]

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="install-modal"
          data-lenis-prevent
          className={cn(HOME_ROOT_CLASS, 'fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onKeyDown={onKeyDown}
        >
          {/* voile */}
          <button aria-label="Fermer" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[6px]" />

          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            className="relative w-full max-w-[440px] rounded-[30px] bg-white shadow-[0_40px_90px_-30px_rgb(14_19_27/0.45)] sm:rounded-[32px]"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-5 sm:px-7">
              <h2 id="install-title" className="text-[18px] font-bold tracking-[-0.01em] text-ink">
                {content.title}
              </h2>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Fermer"
                className="grid size-9 place-items-center rounded-full text-ink/50 transition-colors hover:bg-paper hover:text-ink"
              >
                <Icon icon={Cancel01Icon} size={18} />
              </button>
            </div>

            {/* iPhone / iPad ou Mac */}
            <div className="mx-6 mb-1 grid grid-cols-2 gap-1 rounded-full bg-paper p-1 ring-1 ring-line sm:mx-7" role="tablist" aria-label="Appareil">
              {(['ios', 'mac'] as const).map((d) => (
                <button
                  key={d}
                  role="tab"
                  aria-selected={device === d}
                  onClick={() => setDevice(d)}
                  className={cn('relative rounded-full py-1.5 text-[13px] font-semibold transition-colors', device === d ? 'text-ink' : 'text-ink/50 hover:text-ink')}
                >
                  {device === d && <motion.span layoutId="install-device" className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-line" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="relative">{d === 'ios' ? 'iPhone / iPad' : 'Mac'}</span>
                </button>
              ))}
            </div>

            <div className="mx-6 mt-5 border-t border-line sm:mx-7" />

            <ol className="flex flex-col gap-5 px-6 py-6 sm:px-7">
              {content.steps.map((s, i) => (
                <motion.li
                  key={`${device}-${i}`}
                  className="flex items-start gap-4"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.08 + i * 0.07 }}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blush text-[14px] font-bold text-rose">{i + 1}</span>
                  <Icon icon={s.icon} size={20} className="mt-[7px] shrink-0 text-rose" />
                  <p className="pt-[5px] text-[15px] leading-[1.55] text-ink">{s.text}</p>
                </motion.li>
              ))}
            </ol>

            <div className="mx-6 border-t border-line sm:mx-7" />
            <p className="px-6 pt-5 pb-6 text-[13px] leading-relaxed text-ink-muted sm:px-7 sm:pb-7">
              Cette étape est demandée par Apple lui-même : aucune application externe n’est nécessaire, Agapeo s’installe directement depuis
              le site.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
