'use client'

import { useState } from 'react'
import { AppleIcon, PlayStoreIcon } from '@hugeicons/core-free-icons'
import { Icon, LINKS, cn } from '../lib/ui'
import InstallModal from './InstallModal'

/** Google Play ouvre la fiche de l'application ; Apple ouvre la fenêtre d'installation depuis le navigateur. */
export default function StoreButton({ store, tone = 'dark', className }: { store: 'play' | 'apple'; tone?: 'dark' | 'light'; className?: string }) {
  const [open, setOpen] = useState(false)
  const play = store === 'play'
  const classes = cn(
    'inline-flex h-13 items-center gap-3 rounded-[16px] px-5 text-left transition-colors duration-300',
    tone === 'dark' ? 'bg-ink text-white hover:bg-ink-2' : 'bg-white/10 text-white ring-1 ring-white/15 ring-inset hover:bg-white/15',
    className,
  )
  const label = (
    <>
      <Icon icon={play ? PlayStoreIcon : AppleIcon} size={22} />
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">{play ? 'Disponible sur' : 'Installer sur'}</span>
        <span className="text-[15px] font-semibold">{play ? 'Google Play' : 'iPhone & Mac'}</span>
      </span>
    </>
  )

  if (play)
    return (
      <a href={LINKS.playStore} target="_blank" rel="noopener noreferrer" className={classes}>
        {label}
      </a>
    )

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={classes}>
        {label}
      </button>
      <InstallModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
