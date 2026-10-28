'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import PlayButton from './PlayButton'
import HeartBurst from './HeartBurst'

/** Vidéo de présentation hébergée sur Wistia (« AGAPEO_16x9_voix_Hugo », 42 s). */
export const WISTIA_MEDIA_ID = 'bc07wql9n8'
export const VIDEO_TITLE = 'Découvre Agapeo'
export const VIDEO_SUBTITLE = "L'application de rencontre pensée pour les chrétiens"

/** Élément <wistia-player> une fois défini par player.js (méthodes utilisées ici uniquement). */
type WistiaPlayerElement = HTMLElement & { play?: () => Promise<void> | undefined }

/**
 * Vidéo Wistia : miniature, bouton lecture en dégradé et bulles d'amour au
 * survol. Le lecteur se prépare en arrière-plan (scripts chargés une fois la
 * page affichée, lecteur monté sous la miniature) : au clic, la lecture
 * démarre tout de suite et dans le geste même de l'utilisateur, ce qui permet
 * le son sur iPhone. Si le lecteur n'est pas encore prêt, il démarre dès qu'il
 * l'est (événement api-ready).
 */
export default function HeroVideo({ frameClassName, caption = true }: { frameClassName?: string; caption?: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [hover, setHover] = useState(false)
  const playerRef = useRef<WistiaPlayerElement>(null)
  const wantsPlayRef = useRef(false)

  useEffect(() => {
    const player = playerRef.current
    if (!player) return
    const onReady = () => {
      if (wantsPlayRef.current) void player.play?.()
    }
    player.addEventListener('api-ready', onReady)
    return () => player.removeEventListener('api-ready', onReady)
  }, [])

  const startPlayback = () => {
    wantsPlayRef.current = true
    setPlaying(true)
    const player = playerRef.current
    if (!player) return
    // Lecteur prêt : lecture immédiate (dans le geste). Sinon, autoplay au moment où il le sera.
    const started = player.play?.()
    if (!started) player.setAttribute('autoplay', '')
  }

  return (
    <div className={frameClassName ?? 'rounded-[30px] bg-blush/70 p-1.5 shadow-[0_40px_100px_-50px_rgb(204_28_84/0.45)] sm:rounded-[40px] sm:p-2.5'}>
      <Script src="https://fast.wistia.com/player.js" strategy="lazyOnload" />
      <Script src={`https://fast.wistia.com/embed/${WISTIA_MEDIA_ID}.js`} type="module" strategy="lazyOnload" />

      <div className="relative aspect-video overflow-hidden rounded-[24px] bg-ink sm:rounded-[32px]">
        <div className="absolute inset-0">
          <wistia-player
            ref={playerRef}
            media-id={WISTIA_MEDIA_ID}
            aspect="1.7777777777777777"
            player-color="E83E75"
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
        </div>

        {!playing && (
          <button
            onClick={startPlayback}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            className="group absolute inset-0 block size-full text-left"
            aria-label={`Lire la vidéo : ${VIDEO_TITLE}`}
          >
            <img
              src="/images/home/video-poster-agapeo.jpg"
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-out-soft group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/35 via-ink/0 to-ink/5" />

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
                <span className="block text-[14px] font-semibold text-ink">{VIDEO_TITLE}</span>
                <span className="block text-[12px] text-ink/60">{VIDEO_SUBTITLE}</span>
              </span>
            </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
