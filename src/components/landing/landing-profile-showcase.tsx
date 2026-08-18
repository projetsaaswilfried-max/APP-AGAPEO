import { Icon } from "@iconify/react";

export function LandingProfileShowcase() {
  return (
    <section className="mx-4 md:mx-[40px] rounded-[30px] py-24 bg-zinc-900 text-white overflow-hidden relative mb-12">
      <div className="absolute inset-0 bg-[#E83E75]/5 z-0" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-light text-[#E83E75] tracking-widest uppercase mb-4 block">
            Des célibataires qui partagent ta foi
          </span>
          <h2 className="text-3xl md:text-5xl tracking-tight text-white leading-tight mb-6 font-bricolage font-semibold">
            Découvre la personne. Mais aussi ce qui guide sa vie.
          </h2>
          <p className="text-lg text-zinc-400 font-light">
            Sur chaque profil, tu peux aller au-delà des photos. Découvre son parcours, sa personnalité, ses valeurs et sa
            manière de vivre sa foi. Parce que savoir qu&apos;une personne est chrétienne est important.{" "}
            <strong className="text-white font-light">Comprendre comment elle vit sa foi l&apos;est encore plus.</strong>
          </p>
        </div>

        <div className="max-w-lg mx-auto bg-white rounded-[2.5rem] p-4 shadow-2xl shadow-black/50 transform rotate-1 border border-zinc-800">
          <div className="bg-zinc-50 rounded-[2rem] p-6 text-zinc-900">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#E83E75] to-orange-300 p-1 shrink-0">
                <img src="/images/sarah.png" alt="Sarah" className="w-full h-full rounded-full border-2 border-white object-cover" />
              </div>
              <div>
                <div className="text-2xl tracking-tight font-bricolage font-light">Sarah, 27</div>
                <div className="text-sm text-zinc-500 flex items-center gap-1">
                  <Icon icon="hugeicons:location-01" width={16} height={16} />
                  Abidjan, Côte d&apos;Ivoire
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-xs font-light text-zinc-400 uppercase tracking-wider mb-3">La foi au quotidien</div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E83E75]/10 text-[#E83E75] text-sm font-light">
                    <Icon icon="hugeicons:church" width={16} height={16} />
                    Évangélique
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 text-sm font-light">
                    <Icon icon="hugeicons:sparkles" width={16} height={16} />
                    Impliquée à l&apos;église
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 text-sm font-light">
                    <Icon icon="hugeicons:book-open-01" width={16} height={16} />
                    Lecture quotidienne
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs font-light text-zinc-400 uppercase tracking-wider mb-3">Vision &amp; Valeurs</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-sm">Mariage chrétien</span>
                  <span className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-sm">Fonder une famille</span>
                  <span className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-sm">Service aux autres</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 flex justify-center gap-4">
              <button
                type="button"
                className="w-14 h-14 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
              >
                <Icon icon="hugeicons:cancel-circle" width={28} height={28} />
              </button>
              <button
                type="button"
                className="w-14 h-14 rounded-full bg-[#E83E75] flex items-center justify-center text-white hover:bg-[#d42d62] transition-colors shadow-md shadow-[#E83E75]/30 transform hover:scale-105"
              >
                <Icon icon="hugeicons:heart" width={28} height={28} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
