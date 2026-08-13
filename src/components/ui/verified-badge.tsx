import { Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: { box: "h-3 w-3", icon: 8, stroke: 3.5 },
  sm: { box: "h-3.5 w-3.5", icon: 9, stroke: 3.5 },
  md: { box: "h-4 w-4", icon: 10, stroke: 3.5 },
  lg: { box: "h-5 w-5", icon: 12, stroke: 3 }
};

interface VerifiedBadgeProps {
  size?: keyof typeof SIZES;
  ring?: boolean;
  className?: string;
  title?: string;
}

/** Badge de vérification certifié (Bleu Facebook #1877F2, cercle bleu avec coche blanche) */
export function VerifiedBadge({ size = "md", ring = true, className, title = "Profil certifié et vérifié" }: VerifiedBadgeProps) {
  const { box, icon, stroke } = SIZES[size];
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[#1877F2] text-white shrink-0 shadow-xs",
        ring && "ring-2 ring-background",
        box,
        className
      )}
    >
      <HugeIcon icon={Tick01Icon} size={icon} strokeWidth={stroke} className="text-white" />
    </span>
  );
}
