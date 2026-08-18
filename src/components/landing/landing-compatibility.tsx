import Link from "next/link";
import { Icon } from "@iconify/react";

const CRITERIA = [
  { icon: "solar:book-bookmark-linear", title: "Ta foi", description: "Quelle place Dieu occupe-t-il dans ton quotidien ?", highlighted: false },
  { icon: "solar:home-smile-linear", title: "Ta vie d'église", description: "Comment vis-tu ta foi au sein de ta communauté ?", highlighted: false },
  {
    icon: "solar:users-group-two-rounded-linear",
    title: "Ta vision du couple & mariage",
    description: "Qu'attends-tu d'une relation chrétienne et quelle place accordes-tu au mariage ?",
    highlighted: true
  },
  { icon: "solar:compass-square-linear", title: "Tes valeurs & projets", description: "Quelles convictions orientent tes décisions et dans quelle direction souhaites-tu construire ta vie ?", highlighted: false }
];

export function LandingCompatibility() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1">
            <div className="space-y-4">
              {CRITERIA.map((item) => (
                <div
                  key={item.title}
                  className={
                    item.highlighted
                      ? "p-6 rounded-2xl bg-[#E83E75]/5 border border-[#E83E75]/20 shadow-sm"
                      : "p-6 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-[#E83E75]/20 transition-colors"
                  }
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon icon={item.icon} className="text-[#E83E75] text-xl" width={22} height={22} />
                    <h4 className="text-lg font-medium text-zinc-900">{item.title}</h4>
                  </div>
                  <p className={item.highlighted ? "text-sm text-zinc-600 font-light pl-8" : "text-sm text-zinc-500 font-light pl-8"}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="text-xs font-light text-[#E83E75] tracking-widest uppercase mb-4 block">Plus que des critères</span>
            <h2 className="text-3xl md:text-5xl tracking-tight text-zinc-900 leading-tight mb-6 font-bricolage font-semibold">
              Être chrétien est un point de départ. Pas le seul point commun à rechercher.
            </h2>
            <p className="text-lg text-zinc-500 font-light mb-8">
              Vous pouvez tous les deux aimer Dieu et pourtant avoir des visions très différentes de la vie. AGAPEO t&apos;aide
              donc à regarder plus loin et utilise ces informations pour faire ressortir des profils avec lesquels tu pourrais
              partager bien plus qu&apos;une attirance.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm font-light px-6 py-3 rounded-full hover:bg-zinc-800 transition-all shadow-md"
            >
              Découvrir mes compatibilités
              <Icon icon="hugeicons:arrow-right-01" width={16} height={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
