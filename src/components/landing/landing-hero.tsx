import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";

const TRUST_ITEMS = [
  { icon: "solar:check-circle-linear", label: "Profils vérifiés" },
  { icon: "solar:users-group-rounded-linear", label: "Célibataires chrétiens" },
  { icon: "solar:wallet-2-linear", label: "Inscription gratuite" }
];

export function LandingHero() {
  return (
    <section className="relative mx-4 md:mx-[40px] mt-[100px] pt-24 pb-24 md:pt-36 md:pb-32 overflow-hidden bg-[#E83E75] rounded-[30px]">
      {/* Abstract pink gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E83E75] via-[#e6356f] to-[#cc1c54] z-0" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/20 blur-[120px] rounded-full z-0 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-black/10 blur-[120px] rounded-full z-0 pointer-events-none" />

      {/* Bulles de coeur - GAUCHE (Femme) */}
      {/* Bulle DEVANT (z-[6]) */}
      <div className="absolute top-[20%] md:top-[30%] left-[5%] md:left-[10%] w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float z-[6] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/60 md:text-white/80 text-2xl md:text-3xl" />
      </div>
      {/* Bulle DERRIERE (z-[4]) */}
      <div className="absolute top-[28%] md:top-[38%] left-[8%] md:left-[14%] w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float-delayed z-[4] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/30 md:text-white/50 text-xl md:text-2xl" />
      </div>
      {/* Bulle DEVANT (z-[6]) */}
      <div className="absolute top-[36%] md:top-[46%] left-[4%] md:left-[9%] w-14 h-14 md:w-20 md:h-20 rounded-full bg-white/15 backdrop-blur-lg border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float-slow z-[6] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/50 md:text-white/70 text-3xl md:text-4xl" />
      </div>

      {/* Bulles de coeur - DROITE (Homme) */}
      {/* Bulle DERRIERE (z-[4]) */}
      <div className="absolute top-[25%] md:top-[35%] right-[8%] md:right-[12%] w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float-slow z-[4] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/40 md:text-white/50 text-2xl" />
      </div>
      {/* Bulle DEVANT (z-[6]) */}
      <div className="absolute top-[33%] md:top-[43%] right-[5%] md:right-[8%] w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/15 backdrop-blur-lg border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float z-[6] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/50 md:text-white/70 text-4xl md:text-5xl" />
      </div>
      {/* Bulle DEVANT (z-[6]) */}
      <div className="absolute top-[45%] md:top-[55%] right-[10%] md:right-[15%] w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-center animate-float-delayed z-[6] pointer-events-none">
        <Icon icon="solar:heart-bold" className="text-white/30 md:text-white/40 text-lg" />
      </div>

      <Image
        src="/images/hero-bg.png"
        alt="Célibataires chrétiens"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center z-[5] opacity-90"
      />

      {/* Subtle overlay in the center to ensure white text readability against the image if they overlap */}
      <div
        className="absolute inset-0 z-[10] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(232, 62, 117, 0.7) 0%, rgba(232, 62, 117, 0.2) 50%, rgba(232, 62, 117, 0) 100%)"
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm mb-8">
          <Icon icon="solar:heart-angle-bold" className="text-white" width={16} height={16} />
          <span className="text-xs font-light text-white tracking-wide uppercase">
            L&apos;application de rencontre pensée pour les chrétiens
          </span>
        </div>

        {/* Le titre reste intact (font-bricolage pour les titres), avec des tailles de police optimisées pour mobile */}
        <h1 className="max-w-4xl mx-auto text-4xl sm:text-5xl md:text-7xl tracking-tight text-white leading-[1.1] font-bricolage font-semibold">
          Rencontre quelqu&apos;un qui <br className="hidden md:block" />
          <span className="text-white/80 font-bricolage font-semibold">partage ta foi, tes valeurs</span> <br className="hidden md:block" />
          et ta vision de l&apos;amour.
        </h1>

        {/* Desktop Description Text */}
        <p className="max-w-2xl mx-auto mt-8 text-lg text-white/90 leading-relaxed font-light hidden md:block">
          Rencontre des célibataires chrétiens qui aiment Dieu, partagent tes valeurs et désirent construire une relation
          sincère avec <span className="text-white font-light">Christ au centre</span>. Pas besoin de mettre ta foi de
          côté pour trouver quelqu&apos;un. Ici, elle fait partie de la rencontre dès le départ.
        </p>

        {/* Mobile Image replacement for description text */}
        <div className="md:hidden mt-8 flex justify-center px-4">
          <Image 
            src="/images/hero-mobile-v3.png" 
            alt="Agapeo App" 
            width={280} 
            height={560} 
            className="w-full max-w-[280px] h-auto object-contain drop-shadow-2xl rounded-[30px]"
          />
        </div>

        <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto bg-white text-zinc-900 font-light text-base px-8 py-4 rounded-full hover:bg-zinc-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_rgba(255,255,255,0.7)]"
          >
            Créer mon profil gratuitement
          </Link>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-sm text-white/70 font-light">
          {TRUST_ITEMS.map((item, i) => (
            <div key={item.label} className="flex items-center gap-6">
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
