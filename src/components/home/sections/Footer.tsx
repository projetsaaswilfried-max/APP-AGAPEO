'use client'

import { LINKS } from '../lib/ui'
import StoreButton from '../components/StoreButton'
import { Logo, homeHref } from './Navbar'

const NAV = [
  { label: 'Accueil', href: '#top' },
  { label: 'Découvrir', href: '#decouvrir' },
  { label: 'Comment ça marche', href: '#comment-ca-marche' },
  { label: 'AGAPEO+', href: '#tarifs' },
]
const LEGAL = [
  { label: 'CGV / CGU', href: LINKS.cgv },
  { label: 'Confidentialité', href: LINKS.privacy },
  { label: 'Mentions légales', href: LINKS.legal },
]

export default function Footer({ onHome = true }: { onHome?: boolean } = {}) {
  return (
    <footer className="px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="mx-auto max-w-[1320px] overflow-hidden rounded-[32px] bg-ink px-6 pt-14 pb-1 sm:rounded-[40px] sm:pt-16 text-white sm:px-12 lg:px-16">
        <div className="grid grid-cols-2 gap-12 lg:grid-cols-[1.4fr_0.6fr_0.6fr]">
          <div className="col-span-2 lg:col-span-1">
            <Logo light onHome={onHome} />
            <p className="mt-7 max-w-[440px] font-urbanist text-[26px] leading-[1.15] font-medium sm:text-[28px]">
              Des rencontres chrétiennes pour construire autour de <span className="text-rose-soft">l’essentiel.</span>
            </p>
            <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-white/50">
              Une plateforme destinée aux célibataires chrétiens qui souhaitent rencontrer, aimer et construire sans mettre leur foi de côté.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <StoreButton store="apple" tone="light" />
              <StoreButton store="play" tone="light" />
            </div>
          </div>
          <nav aria-label="Navigation">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40">Navigation</p>
            <ul className="mt-5 flex flex-col gap-3">
              {NAV.map((n) => (
                <li key={n.label}>
                  <a href={homeHref(n.href, onHome)} className="text-[15px] text-white/75 transition-colors hover:text-rose-soft">{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Légal">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40">Légal</p>
            <ul className="mt-5 flex flex-col gap-3">
              {LEGAL.map((n) => (
                <li key={n.label}>
                  <a href={n.href} target="_blank" rel="noopener noreferrer" className="text-[15px] text-white/75 transition-colors hover:text-rose-soft">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-white/10 py-7 text-[13px] text-white/40 sm:flex-row">
          <span>© 2026 AGAPEO. Tous droits réservés.</span>
        </div>
      </div>
    </footer>
  )
}
