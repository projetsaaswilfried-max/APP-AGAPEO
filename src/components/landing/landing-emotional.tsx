import Link from "next/link";
import { Icon } from "@iconify/react";

export function LandingEmotional() {
  return (
    <section className="py-24 bg-[#FFF9F6]">
      <div className="max-w-5xl mx-auto px-6">
        <div className="bg-white border border-[#FCE8EF] rounded-[40px] shadow-[0_8px_40px_rgba(0,0,0,0.04)] p-8 md:p-16 text-center">
          <div className="flex gap-3 mb-10 justify-center max-w-md mx-auto">
            <div className="flex-[1.4] aspect-4/3 rounded-2xl bg-[#FFF5F8] border border-[#FCE8EF] overflow-hidden flex items-center justify-center relative">
              <img src="/images/emotional_photo_1.jpg" alt="Lecture de la Bible" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 aspect-4/3 rounded-2xl bg-[#FFF5F8] border border-[#FCE8EF] overflow-hidden flex items-center justify-center relative">
              <img src="/images/emotional_photo_2.jpg" alt="Couple en prière à l'église" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 aspect-4/3 rounded-2xl bg-[#FFF5F8] border border-[#FCE8EF] overflow-hidden flex items-center justify-center relative">
              <img src="/images/emotional_photo_3.jpg" alt="Couple partageant la parole" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#E83E75] mb-6">
            <span className="w-6 h-px bg-[#E83E75]/40" />
            Une prière, pas un algorithme
            <span className="w-6 h-px bg-[#E83E75]/40" />
          </div>

          <h2 className="text-3xl md:text-5xl tracking-tight mb-8 leading-tight text-zinc-900 font-bricolage font-semibold">
            Tu as prié pour la bonne personne.
          </h2>

          <div className="space-y-2 text-lg md:text-xl font-light text-zinc-500 mb-10">
            <p className="font-bricolage font-light">Peut-être as-tu demandé à Dieu une personne qui comprendrait ta foi.</p>
            <p className="font-bricolage font-light">
              Quelqu&apos;un avec qui prier, Quelqu&apos;un avec qui grandir, Quelqu&apos;un avec qui servir, Quelqu&apos;un
              avec qui construire.
            </p>
          </div>

          <div className="w-16 h-px bg-[#FCE8EF] mx-auto mb-10" />

          <p className="text-base text-zinc-500 mb-10 max-w-xl mx-auto">
            AGAPEO ne peut pas te promettre qui tu rencontreras. <br className="hidden md:block" />
            <span className="text-zinc-900 font-light">Mais nous pouvons créer l&apos;espace où cette rencontre devient possible.</span>
          </p>

          <Link
            href="/register"
            className="group inline-flex items-center gap-2 bg-[#E83E75] text-white text-base font-light px-8 py-4 rounded-full hover:bg-[#d42d62] transition-all shadow-md shadow-[#E83E75]/20"
          >
            Rejoindre AGAPEO
            <Icon icon="hugeicons:arrow-right-01" className="group-hover:translate-x-1 transition-transform" width={16} height={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
