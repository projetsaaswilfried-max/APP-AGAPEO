import { Icon } from "@iconify/react";
import { Quote } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  age: number;
  country: string;
  initial: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Je ne voulais plus avoir à expliquer pourquoi Dieu occupait une place aussi importante dans ma vie. Je voulais rencontrer quelqu'un qui le comprenne déjà.",
    name: "Déborah",
    age: 27,
    country: "Côte d'Ivoire",
    initial: "D"
  },
  {
    quote: "Pour moi, être chrétienne sur une fiche de profil ne suffisait pas. Je voulais savoir comment la personne vivait réellement sa foi.",
    name: "Samuel",
    age: 30,
    country: "Sénégal",
    initial: "S"
  },
  {
    quote: "Je voulais une relation dans laquelle on puisse parler de tout, mais aussi prier ensemble et avancer ensemble avec Dieu.",
    name: "Grâce",
    age: 28,
    country: "Bénin",
    initial: "G"
  },
  {
    quote: "J'ai longtemps cherché sur d'autres applications, mais il manquait toujours l'essentiel : partager les mêmes valeurs spirituelles. Ici, j'ai trouvé une vraie communauté bienveillante.",
    name: "Emmanuel",
    age: 34,
    country: "Togo",
    initial: "E"
  },
  {
    quote: "Au-delà des rencontres, c'est la profondeur des échanges qui m'a marquée. On se comprend sur l'essentiel dès le premier message, ça change tout.",
    name: "Léa",
    age: 25,
    country: "Mali",
    initial: "L"
  }
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="w-[300px] md:w-[380px] bg-white p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between shrink-0 whitespace-normal">
      <div>
        <Quote className="w-8 h-8 text-[#E83E75]/40 mb-6" />
        <p className="text-stone-600 font-extralight mb-8 italic leading-relaxed">&laquo; {testimonial.quote} &raquo;</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#E83E75]/10 text-[#E83E75] flex items-center justify-center text-xl tracking-tight shrink-0 font-bricolage font-light">
          {testimonial.initial}
        </div>
        <div>
          <div className="font-normal text-stone-900">
            {testimonial.name}, {testimonial.age} ans
          </div>
          <div className="text-sm text-stone-500 font-extralight flex items-center mt-0.5">
            <Icon icon="hugeicons:location-01" className="w-3.5 h-3.5 mr-1.5 text-stone-400" width={14} height={14} />
            {testimonial.country}
          </div>
        </div>
      </div>
    </div>
  );
}

function MarqueeRow({ order, direction }: { order: Testimonial[]; direction: "left" | "right" }) {
  return (
    <div className={`flex gap-6 md:gap-8 items-stretch ${direction === "left" ? "landing-marquee-left" : "landing-marquee-right"}`}>
      <div className="flex gap-6 md:gap-8 shrink-0 items-stretch">
        {order.map((t) => (
          <TestimonialCard key={`${t.name}-a`} testimonial={t} />
        ))}
      </div>
      <div className="flex gap-6 md:gap-8 shrink-0 items-stretch" aria-hidden="true">
        {order.map((t) => (
          <TestimonialCard key={`${t.name}-b`} testimonial={t} />
        ))}
      </div>
    </div>
  );
}

const ROW_2_ORDER = [TESTIMONIALS[3], TESTIMONIALS[4], TESTIMONIALS[0], TESTIMONIALS[1], TESTIMONIALS[2]];

export function LandingTestimonials() {
  return (
    <section className="text-white bg-zinc-50 py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-light text-[#E83E75] tracking-widest uppercase mb-4 block">La communauté Agapeo</span>
          <h2 className="md:text-4xl leading-tight text-3xl text-stone-950 tracking-tight font-bricolage font-semibold">
            Ils cherchaient quelqu&apos;un avec qui partager aussi leur foi.
          </h2>
        </div>

        <div
          className="landing-marquee-group relative w-full overflow-hidden py-4 flex flex-col gap-6 md:gap-8"
          style={{
            WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
            maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)"
          }}
        >
          <MarqueeRow order={TESTIMONIALS} direction="left" />
          <MarqueeRow order={ROW_2_ORDER} direction="right" />
        </div>
      </div>
    </section>
  );
}
