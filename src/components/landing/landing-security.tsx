import { Icon } from "@iconify/react";

const POINTS = [
  { icon: "solar:shield-check-linear", title: "Profils vérifiés", description: "Nous mettons en place des vérifications destinées à limiter les faux profils et les comptes frauduleux." },
  { icon: "solar:user-speak-rounded-linear", title: "Communauté modérée", description: "Les contenus et comportements contraires aux règles de la communauté peuvent être signalés et modérés." },
  { icon: "solar:eye-closed-linear", title: "Vie privée protégée", description: "Tu contrôles les informations que tu souhaites afficher et partager avec les autres membres." },
  { icon: "solar:forbidden-circle-linear", title: "Signaler ou bloquer", description: "Une interaction te met mal à l'aise ? Tu peux immédiatement la limiter, bloquer le profil ou effectuer un signalement." }
];

export function LandingSecurity() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-16">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <span className="text-xs font-light text-[#E83E75] tracking-widest uppercase mb-4 block">
              Une communauté à protéger
            </span>
            <h2 className="text-3xl md:text-4xl tracking-tight text-zinc-900 leading-tight mb-6 font-bricolage font-semibold">
              Un environnement sain pour des rencontres sincères.
            </h2>
            <p className="text-lg text-zinc-500 font-light">
              Partager la même foi ne dispense jamais d&apos;être prudent. C&apos;est pourquoi AGAPEO met en place plusieurs
              protections pour permettre à sa communauté de faire connaissance avec davantage de sérénité.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
          {POINTS.map((point) => (
            <div key={point.title} className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
              <Icon icon={point.icon} className="text-3xl text-[#E83E75] mb-4" width={32} height={32} />
              <h3 className="text-lg font-medium text-zinc-900 mb-2">{point.title}</h3>
              <p className="text-sm text-zinc-500 font-light">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
