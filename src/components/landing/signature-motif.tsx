import { AgapeoSymbol } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/** Tache de couleur organique, contour irrégulier façon aquarelle — remplace les blobs flous génériques. */
export function DecorativeBlob({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 200" className={cn("absolute pointer-events-none", className)} fill="hsl(var(--primary) / 0.14)">
      <path d="M45,-58C59,-49,71,-35,75,-19C79,-3,75,15,66,31C57,47,43,61,26,68C9,75,-11,75,-29,68C-47,61,-63,47,-71,29C-79,11,-79,-11,-71,-29C-63,-47,-47,-61,-29,-68C-11,-75,9,-75,26,-68C43,-61,31,-67,45,-58Z" transform="translate(100 100)" />
    </svg>
  );
}

/** Petits éléments décoratifs épars (points, coeurs) — évoque le confetti manuscrit de la référence, sans étoiles. */
export function ScatterDots({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 220 220" className={cn("absolute pointer-events-none", className)} fill="none">
      <circle cx="20" cy="40" r="5" fill="hsl(var(--primary) / 0.5)" />
      <circle cx="200" cy="20" r="4" fill="hsl(var(--primary) / 0.35)" />
      <circle cx="190" cy="150" r="6" fill="hsl(var(--primary) / 0.3)" />
      <circle cx="10" cy="180" r="4" fill="hsl(var(--primary) / 0.4)" />
      <path d="M110 60 c -8 -10, -24 -4, -22 8 c 2 12, 22 22, 22 22 c 0 0, 20 -10, 22 -22 c 2 -12, -14 -18, -22 -8Z" fill="hsl(var(--primary) / 0.3)" />
      <path
        d="M50 110 q 8 -14 20 -6"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Filigrane du monogramme AGAPEO en fond — identité de marque plutôt qu'une photo de banque d'images. */
export function MonogramWatermark({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("absolute pointer-events-none opacity-[0.05]", className)}>
      <AgapeoSymbol className="w-full h-full" />
    </div>
  );
}
