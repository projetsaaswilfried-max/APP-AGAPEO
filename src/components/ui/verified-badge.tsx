import { Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: { box: "h-3 w-3", icon: 8, stroke: 3.5 },
  sm: { box: "h-3.5 w-3.5", icon: 9, stroke: 3.5 },
  md: { box: "h-4 w-4", icon: 10, stroke: 3.5 },
  lg: { box: "h-5 w-5", icon: 12, stroke: 3 }
};

const COLORS = {
  // Rose Agapeo — badge "membre vérifié" par défaut, partout sur la plateforme.
  pink: "bg-[#FE70B2]",
  // Bleu Facebook — réservé exclusivement au badge "officiel" du fil d'actualité,
  // pour le distinguer visuellement d'un simple membre vérifié.
  blue: "bg-[#1877F2]"
};

interface VerifiedBadgeProps {
  size?: keyof typeof SIZES;
  color?: keyof typeof COLORS;
  ring?: boolean;
  className?: string;
  title?: string;
}

/** Badge de vérification certifié (façon coche Facebook, rose par défaut — bleu réservé au fil d'actualité) */
export function VerifiedBadge({ size = "md", color = "pink", ring = true, className, title = "Profil certifié et vérifié" }: VerifiedBadgeProps) {
  const { box, icon, stroke } = SIZES[size];
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded-full text-white shrink-0 shadow-xs",
        COLORS[color],
        ring && "ring-2 ring-background",
        box,
        className
      )}
    >
      <HugeIcon icon={Tick01Icon} size={icon} strokeWidth={stroke} className="text-white" />
    </span>
  );
}
