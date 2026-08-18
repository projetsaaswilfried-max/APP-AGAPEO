import Link from "next/link";
import { Icon } from "@iconify/react";

export function LandingDiscoverIntro() {
  return (
    <section id="decouvrir" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-xs font-light text-[#E83E75] tracking-widest uppercase mb-4 block">Bienvenue sur Agapeo</span>
          <h2 className="text-4xl md:text-5xl tracking-tight text-zinc-900 leading-tight mb-6 font-bricolage font-semibold">
            Rencontrer quelqu&apos;un qui comprend vraiment ta foi.
          </h2>
          <div className="space-y-6 text-lg text-zinc-500 font-light">
            <p>
              Sur les applications classiques, tu peux trouver quelqu&apos;un qui partage ta musique préférée, tes voyages ou
              tes passions.
            </p>
            <p>
              Mais trouver quelqu&apos;un qui comprend{" "}
              <strong className="font-light text-zinc-900">
                ta relation avec Dieu, tes convictions et ta vision chrétienne du couple
              </strong>
              , c&apos;est une autre histoire.
            </p>
            <p>
              C&apos;est précisément pour cela qu&apos;AGAPEO existe. Un espace où des célibataires chrétiens peuvent se
              découvrir autour de ce qui compte vraiment.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 mt-10 text-[#E83E75] font-light hover:text-[#d42d62] transition-colors group"
          >
            Découvrir AGAPEO
            <Icon icon="hugeicons:arrow-right-01" className="group-hover:translate-x-1 transition-transform" width={16} height={16} />
          </Link>
        </div>

        <div className="relative h-[400px] md:h-[500px] lg:h-[600px] flex items-center justify-center">
          {/* Decorative Solid Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] md:w-[400px] md:h-[400px] lg:w-[480px] lg:h-[480px] bg-[#FFF5F8] border border-[#FCE8EF] rounded-full z-0" />
          
          {/* Blur blob for glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 md:w-96 h-64 md:h-96 bg-[#E83E75]/20 blur-[100px] rounded-full z-0 pointer-events-none" />
          
          <img
            src="/images/welcome-phone.png"
            alt="Bienvenue sur Agapeo"
            className="w-full h-full object-contain drop-shadow-2xl relative z-10"
          />
        </div>
      </div>
    </section>
  );
}
