'use client'

import Link from 'next/link'
import { motion, type HTMLMotionProps } from 'motion/react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import type { ReactNode } from 'react'
import { SITE_CONFIG } from '@/config/site'

// Routes internes de l'app (la landing Vite d'origine pointait vers https://www.agapeo.love/...).
export const LINKS = {
  register: '/register',
  login: '/login',
  playStore: SITE_CONFIG.apps.playStoreUrl,
  cgv: SITE_CONFIG.links.terms,
  privacy: SITE_CONFIG.links.privacy,
  legal: SITE_CONFIG.links.legal,
}

export const EASE = [0.22, 1, 0.36, 1] as const

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function Icon({ icon, size = 20, className, strokeWidth }: { icon: IconSvgElement; size?: number; className?: string; strokeWidth?: number }) {
  return <HugeiconsIcon icon={icon} size={size} className={className} strokeWidth={strokeWidth} />
}

/** Apparition douce au scroll (fade + translate) */
export function Reveal({ children, delay = 0, y = 28, className, ...rest }: HTMLMotionProps<'div'> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function Eyebrow({ children, tone = 'light', className }: { children: ReactNode; tone?: 'light' | 'dark'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em]',
        tone === 'light' ? 'text-rose' : 'text-rose-soft',
        className,
      )}
    >
      {children}
    </span>
  )
}

type BtnProps = {
  href: string
  children: ReactNode
  variant?: 'primary' | 'dark' | 'ghost' | 'light'
  className?: string
  arrow?: boolean
  full?: boolean
}

export function Button({ href, children, variant = 'primary', className, arrow = true, full = false }: BtnProps) {
  const external = href.startsWith('http')
  // Navigation client (avec préchargement) pour les routes de l'app ; les ancres (#...) restent des <a> gérés par Lenis.
  const Anchor = href.startsWith('/') ? Link : 'a'
  return (
    <Anchor
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cn(
        'group relative inline-flex h-13 items-center gap-3 rounded-full pl-6 text-[15px] font-semibold transition-all duration-500 ease-out-soft',
        full ? 'w-full justify-between' : 'justify-center',
        arrow ? 'pr-1.5' : 'pr-6',
        variant === 'primary' && 'bg-rose text-white hover:bg-rose-deep',
        variant === 'dark' && 'bg-ink text-white hover:bg-ink-2',
        variant === 'light' && 'bg-white text-ink hover:bg-blush',
        variant === 'ghost' && 'bg-transparent text-ink ring-1 ring-line ring-inset hover:bg-white',
        className,
      )}
    >
      <span>{children}</span>
      {arrow && (
        <span
          className={cn(
            'grid size-10 place-items-center overflow-hidden rounded-full transition-transform duration-500 ease-out-soft group-hover:rotate-[-45deg]',
            variant === 'primary' && 'bg-white text-rose',
            variant === 'dark' && 'bg-rose text-white',
            variant === 'light' && 'bg-rose text-white',
            variant === 'ghost' && 'bg-ink text-white',
          )}
        >
          <Icon icon={ArrowRight02Icon} size={18} />
        </span>
      )}
    </Anchor>
  )
}
