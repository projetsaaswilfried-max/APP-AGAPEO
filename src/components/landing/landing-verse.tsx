import Link from "next/link";
import { Icon } from "@iconify/react";

export function LandingVerse() {
  return (
    <section className="mx-4 md:mx-[40px] rounded-[30px] py-24 md:py-32 bg-zinc-900 relative overflow-hidden mb-12">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#E83E75]/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#E83E75]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10 flex flex-col items-center">
        {/* The Verse Card */}
        <div className="relative w-full max-w-3xl mb-16 p-10 md:p-14 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-[40px]">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#E83E75] flex items-center justify-center shadow-lg shadow-[#E83E75]/30">
            <Icon icon="hugeicons:quote-down" className="text-white text-xl" />
          </div>
          
          <p className="text-2xl md:text-4xl text-white leading-relaxed font-bricolage font-light">
            &laquo; Et par-dessus toutes ces choses, revêtez-vous de l&apos;amour, qui est le lien de la perfection. &raquo;
          </p>
          <div className="mt-8 pt-6 border-t border-white/10">
            <span className="text-sm font-light text-[#E83E75] tracking-[0.2em] uppercase">
              Colossiens 3:14
            </span>
          </div>
        </div>

        <h2 className="text-3xl md:text-5xl tracking-tight text-white leading-tight mb-8 font-bricolage font-semibold">
          L&apos;amour que tu souhaites construire commence peut-être par une rencontre.
        </h2>

        <p className="text-lg text-white/60 font-light mb-12 max-w-xl mx-auto leading-relaxed">
          Une personne, une conversation, une foi partagée. Et deux chemins qui commencent peut-être à n&apos;en former qu&apos;un.
        </p>

        <Link
          href="/register"
          className="inline-flex bg-[#E83E75] text-white text-base font-light px-10 py-5 rounded-full hover:bg-[#d42d62] transition-all shadow-lg shadow-[#E83E75]/20"
        >
          Créer mon profil gratuitement
        </Link>
      </div>
    </section>
  );
}
