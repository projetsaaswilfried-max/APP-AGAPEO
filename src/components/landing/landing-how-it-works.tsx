import Link from "next/link";

const STEPS = [
  { number: "01", title: "Présente qui tu es vraiment", description: "Parle de toi, de tes passions, de ton parcours avec Dieu, de tes valeurs et de la personne que tu aimerais rencontrer." },
  { number: "02", title: "Découvre des célibataires", description: "Explore des profils qui correspondent à tes préférences, tes convictions et ta manière d'envisager une relation." },
  { number: "03", title: "Fais connaissance", description: "Une personne retient ton attention ? Découvre vos points communs et engage une conversation sincère." },
  { number: "04", title: "Avance avec intention", description: "Prenez le temps de vous découvrir, de prier, de parler de vos projets et de discerner si vos chemins continuent ensemble." }
];

export function LandingHowItWorks() {
  return (
    <section id="comment-ca-marche" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-xs font-light text-[#E83E75] tracking-widest uppercase mb-4 block">
            Une rencontre peut commencer ici
          </span>
          <h2 className="text-3xl md:text-5xl tracking-tight text-zinc-900 leading-tight font-bricolage font-semibold">
            Fais le premier pas. Laisse Dieu écrire la suite.
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-8 relative">
          <div className="hidden md:block absolute top-8 left-12 right-12 h-px bg-zinc-200 -z-10" />

          {STEPS.map((step) => (
            <div key={step.number} className="relative group">
              <div className="w-16 h-16 rounded-full bg-white border border-zinc-100 shadow-sm flex items-center justify-center text-[#E83E75] group-hover:bg-[#E83E75] group-hover:text-white group-hover:border-[#E83E75] transition-colors duration-300 text-xl leading-none mb-6 mx-auto md:mx-0 font-bricolage font-light">
                {step.number}
              </div>
              <h3 className="font-medium text-lg text-zinc-900 mb-3 text-center md:text-left">{step.title}</h3>
              <p className="text-sm text-zinc-500 font-light text-center md:text-left">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/register"
            className="inline-flex bg-[#E83E75] text-white text-base font-light px-8 py-4 rounded-full hover:bg-[#d42d62] transition-all shadow-md shadow-[#E83E75]/20"
          >
            Créer mon profil
          </Link>
        </div>
      </div>
    </section>
  );
}
