'use client'

import { PlayIcon } from '@hugeicons/core-free-icons'
import { Icon, cn } from '../lib/ui'

/** Bouton lecture : dégradé framboise → rose clair, halo de verre, onde, et reflet qui balaie le bouton au survol (piloté par `group`). */
export default function PlayButton({ className }: { className?: string }) {
  return (
    <span className={cn('relative grid place-items-center', className)}>
      <span className="absolute inset-[-14px] rounded-full bg-white/25 ring-1 ring-white/50 backdrop-blur-md transition-transform duration-700 ease-out-soft group-hover:scale-[1.18]" />
      <span className="absolute inset-0 animate-ping rounded-full bg-white/40 [animation-duration:2.6s]" />
      <span className="relative grid size-full place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--color-rose)_0%,var(--color-rose-soft)_60%,#ffa9d2_100%)] text-white shadow-[0_18px_40px_-14px_rgb(204_28_84/0.75)] ring-2 ring-white/70 transition-transform duration-700 ease-out-soft group-hover:scale-110 group-hover:rotate-[8deg]">
        <span className="absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/45 transition-transform duration-[900ms] ease-out-soft group-hover:translate-x-[420%]" />
        <Icon icon={PlayIcon} size={30} strokeWidth={2} className="relative translate-x-[2px] transition-transform duration-500 group-hover:scale-110" />
      </span>
    </span>
  )
}
