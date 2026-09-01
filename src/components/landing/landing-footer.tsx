import Link from "next/link";
import { AppleStoreBadge, GooglePlayBadge } from "@/components/shared/store-badges";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "#decouvrir", label: "Découvrir" },
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#tarifs", label: "AGAPEO+" },
  { href: "#telecharger", label: "App" }
];

export function LandingFooter() {
  return (
    <footer id="telecharger" className="bg-zinc-50 pt-10 pb-6 scroll-mt-32 sm:scroll-mt-36">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-10 md:gap-16 lg:gap-24 mb-10 border-b border-zinc-100 pb-10">
          <div className="flex-[2] max-w-sm">
            <Link href="/" className="mb-6 inline-flex flex-col group">
              <img src="/images/agapeo-symbol.png" alt="" className="h-11 md:h-14 w-auto object-contain transition-transform duration-200 group-hover:scale-105" />
              <span className="mt-1 font-display font-light tracking-tight text-[#FE72B2] text-lg md:text-xl leading-none">AGAPEO</span>
            </Link>
            <h3 className="text-lg font-medium text-zinc-900 mb-4 pr-4">
              Des rencontres chrétiennes pour construire autour de l&apos;essentiel.
            </h3>
            <p className="text-sm text-zinc-500 font-light pr-8 leading-relaxed">
              Une plateforme destinée aux célibataires chrétiens qui souhaitent rencontrer, aimer et construire sans mettre
              leur foi de côté.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <AppleStoreBadge />
              <GooglePlayBadge />
            </div>
          </div>

          <div className="flex-1">
            <h4 className="text-xs font-medium text-zinc-900 uppercase tracking-widest mb-4">Navigation</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500 font-light">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-[#E83E75] hover:translate-x-0.5 inline-block transition-all">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1">
            <h4 className="text-xs font-medium text-zinc-900 uppercase tracking-widest mb-4">Légal</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500 font-light">
              <li>
                <Link href="/cgv" className="hover:text-[#E83E75] hover:translate-x-0.5 inline-block transition-all">
                  CGV / CGU
                </Link>
              </li>
              <li>
                <Link href="/politique-de-confidentialite" className="hover:text-[#E83E75] hover:translate-x-0.5 inline-block transition-all">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className="hover:text-[#E83E75] hover:translate-x-0.5 inline-block transition-all">
                  Mentions légales
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-400 font-light">© {new Date().getFullYear()} AGAPEO. Tous droits réservés.</p>
          <div className="text-xs font-light text-zinc-500 tracking-widest uppercase flex items-center gap-2">
            Foi <span className="w-1 h-1 rounded-full bg-zinc-300" /> Rencontre <span className="w-1 h-1 rounded-full bg-zinc-300" /> Amour
          </div>
        </div>
      </div>
    </footer>
  );
}
