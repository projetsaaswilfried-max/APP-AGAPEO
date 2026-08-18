import { Icon } from "@iconify/react";

const FEATURES = [
  {
    icon: "solar:sun-2-linear",
    title: "Une foi réellement partagée",
    description: "Découvre des personnes pour qui suivre Christ fait réellement partie du quotidien."
  },
  {
    icon: "solar:target-linear",
    title: "Des intentions claires",
    description: "Exprime ce que tu recherches et rencontre des personnes qui souhaitent elles aussi construire une relation sérieuse."
  },
  {
    icon: "solar:link-circle-linear",
    title: "Des valeurs qui rapprochent",
    description: "Famille, engagement, fidélité, service, foi, projets : découvre ce que vous avez réellement en commun."
  },
  {
    icon: "solar:hearts-linear",
    title: "Christ au centre",
    description: "AGAPEO encourage des rencontres où la foi n'arrive pas après la relation, mais peut en faire partie dès le commencement."
  }
];

export function LandingWhyAgapeo() {
  return (
    <section className="py-24 bg-zinc-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-light text-[#E83E75] tracking-widest uppercase mb-4 block">
            Une autre vision de la rencontre chrétienne
          </span>
          <h2 className="text-3xl md:text-5xl tracking-tight text-zinc-900 leading-tight font-bricolage font-semibold">
            Ne choisis pas seulement quelqu&apos;un qui te plaît.{" "}
            <span className="text-zinc-400 font-bricolage font-light">Découvre quelqu&apos;un avec qui avancer dans la foi.</span>
          </h2>
          <p className="mt-6 text-lg text-zinc-500 font-light">
            Une relation chrétienne ne repose pas uniquement sur l&apos;attirance. Elle se construit aussi autour de
            convictions communes, d&apos;une même direction spirituelle et d&apos;une vision compatible de la vie.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white p-8 rounded-3xl border border-zinc-100 hover:shadow-lg hover:shadow-zinc-200/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#E83E75]/5 text-[#E83E75] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icon icon={feature.icon} width={24} height={24} />
              </div>
              <h3 className="text-xl tracking-tight text-zinc-900 mb-3 font-bricolage font-semibold">{feature.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-light">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
