import { Icon } from "@iconify/react";

const FAQ_ITEMS = [
  {
    q: "AGAPEO est-il exclusivement réservé aux chrétiens ?",
    a: "Oui. AGAPEO a été pensé pour permettre aux célibataires chrétiens de rencontrer des personnes qui partagent leur foi et souhaitent construire une relation sérieuse."
  },
  {
    q: "Quelles confessions chrétiennes sont présentes ?",
    a: "AGAPEO peut accueillir différentes sensibilités chrétiennes. Chaque membre peut préciser sa confession, son parcours et ses préférences directement dans son profil."
  },
  {
    q: "AGAPEO est-il uniquement destiné au mariage ?",
    a: "AGAPEO est destiné aux personnes ouvertes à une relation sérieuse et engagée. Il ne s'agit pas de précipiter un mariage, mais de favoriser des rencontres avec des intentions claires."
  },
  {
    q: "Pourquoi renseigner des informations sur ma foi ?",
    a: "Parce que « chrétien » peut représenter des réalités différentes pour chacun. Ces informations permettent de mieux comprendre les convictions et la manière de vivre la foi de chaque personne."
  },
  {
    q: "Comment fonctionne la compatibilité ?",
    a: "AGAPEO tient compte de plusieurs dimensions : foi, valeurs, personnalité, vision du couple, projet familial, centres d'intérêt et préférences personnelles."
  },
  {
    q: "Est-ce gratuit ?",
    a: "Tu peux créer ton profil et commencer à découvrir AGAPEO gratuitement. Certaines fonctionnalités supplémentaires sont accessibles avec AGAPEO+."
  },
  {
    q: "Comment AGAPEO protège-t-il sa communauté ?",
    a: "AGAPEO combine vérification, outils de confidentialité, signalement, blocage et modération afin de favoriser un environnement plus sain."
  }
];

export function LandingFaq() {
  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-light text-[#E83E75] tracking-widest uppercase mb-4 block">Questions fréquentes</span>
          <h2 className="text-3xl md:text-4xl tracking-tight text-zinc-900 font-bricolage font-semibold">
            Avant de rejoindre AGAPEO
          </h2>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={item.q}
              className="group bg-zinc-50 rounded-2xl border border-zinc-100 open:bg-white open:border-[#E83E75]/20 transition-colors"
              open={i === 5}
            >
              <summary className="flex justify-between items-center font-light cursor-pointer p-6 text-zinc-900 group-open:text-[#E83E75] list-none [&::-webkit-details-marker]:hidden">
                <span className="text-lg font-bricolage">{item.q}</span>
                <Icon
                  icon="solar:alt-arrow-down-linear"
                  className="text-xl transition-transform group-open:rotate-180 shrink-0 ml-4"
                  width={20}
                  height={20}
                />
              </summary>
              <div className="px-6 pb-6 text-zinc-500 font-light text-sm leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
