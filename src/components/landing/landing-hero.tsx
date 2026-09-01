import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";

const TRUST_ITEMS = [
  { icon: "solar:check-circle-linear", label: "Profils vérifiés" },
  { icon: "solar:users-group-rounded-linear", label: "Célibataires chrétiens" },
  { icon: "solar:wallet-2-linear", label: "Paiement 100% sécurisé" }
];

export function LandingHero() {
  return (
    <section className="relative mx-3 sm:mx-6 xl:mx-[40px] mt-[85px] sm:mt-[95px] xl:mt-[105px] pt-12 sm:pt-16 md:pt-20 xl:pt-36 pb-16 sm:pb-20 md:pb-24 xl:pb-32 overflow-hidden bg-[#E83E75] rounded-[24px] sm:rounded-[30px]">
      {/* Abstract pink gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E83E75] via-[#e6356f] to-[#cc1c54] z-0" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/20 blur-[120px] rounded-full z-0 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-black/10 blur-[120px] rounded-full z-0 pointer-events-none" />

      {/* Bulles de coeur - GAUCHE (Femme) */}
      <div className="absolute top-[18%] xl:top-[30%] left-[3%] xl:left-[10%] w-9 h-9 sm:w-12 sm:h-12 xl:w-16 xl:h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float z-[6] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/60 xl:text-white/80 text-lg sm:text-2xl xl:text-3xl" />
      </div>
      <div className="absolute top-[26%] xl:top-[38%] left-[6%] xl:left-[14%] w-6 h-6 sm:w-8 sm:h-8 xl:w-10 xl:h-10 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float-delayed z-[4] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/30 xl:text-white/50 text-sm sm:text-xl xl:text-2xl" />
      </div>
      <div className="absolute top-[34%] xl:top-[46%] left-[2%] xl:left-[9%] w-10 h-10 sm:w-14 sm:h-14 xl:w-20 xl:h-20 rounded-full bg-white/15 backdrop-blur-lg border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float-slow z-[6] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/50 xl:text-white/70 text-xl sm:text-3xl xl:text-4xl" />
      </div>

      {/* Bulles de coeur - DROITE (Homme) */}
      <div className="absolute top-[22%] xl:top-[35%] right-[4%] xl:right-[12%] w-8 h-8 sm:w-10 sm:h-10 xl:w-14 xl:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float-slow z-[4] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/40 xl:text-white/50 text-base xl:text-2xl" />
      </div>
      <div className="absolute top-[30%] xl:top-[43%] right-[3%] xl:right-[8%] w-12 h-12 sm:w-16 sm:h-16 xl:w-24 xl:h-24 rounded-full bg-white/15 backdrop-blur-lg border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float z-[6] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/50 xl:text-white/70 text-2xl sm:text-4xl xl:text-5xl" />
      </div>
      <div className="absolute top-[42%] xl:top-[55%] right-[6%] xl:right-[15%] w-5 h-5 sm:w-6 sm:h-6 xl:w-8 xl:h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float-delayed z-[6] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/30 xl:text-white/40 text-xs xl:text-lg" />
      </div>

      {/* Background Image: Masqué sur mobile/tablette/Surface Duo (< 1280px), visible uniquement sur Desktop (>= 1280px) avec cadrage optimisé MacBook Air & All Desktops */}
      <Image
        src="/images/hero-bg.png"
        alt="Célibataires chrétiens"
        fill
        priority
        sizes="100vw"
        className="hidden xl:block object-cover object-[center_35%] z-[5] opacity-95"
      />

      {/* Subtle overlay in the center */}
      <div
        className="absolute inset-0 z-[10] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(232, 62, 117, 0.7) 0%, rgba(232, 62, 117, 0.2) 50%, rgba(232, 62, 117, 0) 100%)"
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm mb-5 sm:mb-7">
          <Icon icon="solar:heart-angle-bold" className="text-white" width={16} height={16} />
          <span className="text-[11px] sm:text-xs font-light text-white tracking-wide uppercase">
            L&apos;application de rencontre pensée pour les chrétiens
          </span>
        </div>

        {/* Titre responsive mobile (text-3xl comme les autres titres de la landing page), tablette (y compris Surface Duo) et desktop */}
        <h1 className="max-w-4xl mx-auto text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl tracking-tight text-white leading-[1.14] font-bricolage font-semibold">
          Rencontre quelqu&apos;un qui <br className="hidden xl:block" />
          <span className="text-white/80 font-bricolage font-semibold">partage ta foi, tes valeurs</span> <br className="hidden xl:block" />
          et ta vision de l&apos;amour.
        </h1>

        {/* Desktop Description Text (Seulement >= 1280px / xl) */}
        <p className="max-w-2xl mx-auto mt-8 text-lg text-white/90 leading-relaxed font-light hidden xl:block">
          Rencontre des célibataires chrétiens qui aiment Dieu, partagent tes valeurs et désirent construire une relation
          sincère avec <span className="text-white font-light">Christ au centre</span>. Pas besoin de mettre ta foi de
          côté pour trouver quelqu&apos;un. Ici, elle fait partie de la rencontre dès le départ.
        </p>

        {/* Mobile & Tablet Image replacement (Toutes versions mobiles, tablettes et Surface Duo < 1280px) */}
        <div className="xl:hidden mt-5 sm:mt-7 md:mt-8 -mb-10 sm:-mb-14 md:-mb-18 flex justify-center px-2 relative z-10">
          <Image 
            src="/images/hero-mobile-transparent-v4.png" 
            alt="Agapeo App" 
            width={819} 
            height={1024} 
            priority
            className="w-full max-w-[320px] sm:max-w-[420px] md:max-w-[500px] lg:max-w-[580px] h-auto object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.3)]"
          />
        </div>

        <div className="mt-0 xl:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-20">
          <Link
            href="/register"
            className="w-auto max-w-[280px] xs:max-w-[300px] sm:max-w-[620px] md:max-w-[760px] lg:max-w-[840px] bg-white text-zinc-900 font-semibold text-sm sm:text-lg md:text-xl lg:text-2xl px-5 py-3 sm:px-12 md:px-16 sm:py-5 md:py-6 rounded-full hover:bg-zinc-100 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_0_35px_rgba(255,255,255,0.7)] text-center"
          >
            Créer mon profil
          </Link>
        </div>

        <div className="mt-8 sm:mt-10 xl:mt-14 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-white/70 font-light">
          {TRUST_ITEMS.map((item, i) => (
            <div key={item.label} className="flex items-center gap-4 sm:gap-6">
              {i > 0 && <div className="w-1 h-1 rounded-full bg-white/30 hidden sm:block" />}
              <div className="flex items-center gap-2">
                <Icon icon={item.icon} className="text-white" width={18} height={18} />
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
