'use client'

import { useState } from 'react'
import PlayButton from './PlayButton'
import HeartBurst from './HeartBurst'

export const YT_ID = 'vwIz0q0LYwk'
export const YT_TITLE = 'Le mariage selon la Bible'
export const YT_AUTHOR = 'Dr Amagou Wilfried Zahui'

/** Vidéo YouTube : miniature, bouton lecture en dégradé et bulles d'amour au survol ; le lecteur se charge au clic. */
export default function HeroVideo({ frameClassName, caption = true }: { frameClassName?: string; caption?: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [hover, setHover] = useState(false)

  return (
    <div className={frameClassName ?? 'rounded-[30px] bg-blush/70 p-1.5 shadow-[0_40px_100px_-50px_rgb(204_28_84/0.45)] sm:rounded-[40px] sm:p-2.5'}>
      <div className="relative aspect-video overflow-hidden rounded-[24px] bg-ink sm:rounded-[32px]">
        {playing ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${YT_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={`${YT_TITLE} | ${YT_AUTHOR}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            className="group absolute inset-0 block size-full text-left"
            aria-label={`Lire la vidéo : ${YT_TITLE}`}
          >
            <img
              src="/images/home/video-poster.jpg"
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-out-soft group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/45 via-ink/5 to-ink/10" />

            {/* bouton lecture au centre */}
            <span className="absolute inset-0 grid place-items-center">
              <HeartBurst active={hover} spread={1.7} tone="light" bubbles={0.65}>
                <PlayButton className="size-16 sm:size-24" />
              </HeartBurst>
            </span>

            {/* légende */}
            {caption && (
            <span className="glass absolute bottom-3 left-3 hidden items-center gap-3 rounded-full py-2 pr-5 pl-2 sm:bottom-6 sm:left-6 sm:flex">
              <span className="grid size-9 place-items-center rounded-full bg-blush">
                <img src="/images/home/logo.png" alt="" className="size-5 object-contain" />
              </span>
              <span className="leading-tight">
                <span className="block text-[14px] font-semibold text-ink">{YT_TITLE}</span>
                <span className="block text-[12px] text-ink/60">{YT_AUTHOR}</span>
              </span>
            </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
