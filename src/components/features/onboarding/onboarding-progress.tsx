import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  currentStep: number;
  labels: string[];
  /** Fourni = étapes cliquables (navigation libre, ex: revenir corriger une section déjà remplie). */
  onStepClick?: (step: number) => void;
}

/** Étapes numérotées (pas de barre de progression, règle de design) — cliquables si onStepClick est fourni. */
export function OnboardingProgress({ currentStep, labels, onStepClick }: OnboardingProgressProps) {
  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-center gap-2">
        {labels.map((label, index) => {
          const className = cn(
            "w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center transition-colors",
            index === currentStep
              ? "bg-primary text-primary-foreground"
              : index < currentStep
                ? "bg-accent-subtle text-primary"
                : "bg-secondary text-muted-foreground"
          );
          return onStepClick ? (
            <button
              key={label}
              type="button"
              onClick={() => onStepClick(index)}
              title={label}
              aria-label={`Aller à l'étape ${index + 1} : ${label}`}
              aria-current={index === currentStep ? "step" : undefined}
              className={cn(className, "cursor-pointer hover:opacity-85")}
            >
              {index + 1}
            </button>
          ) : (
            <span key={label} className={className} aria-current={index === currentStep ? "step" : undefined}>
              {index + 1}
            </span>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Étape {currentStep + 1} sur {labels.length} : {labels[currentStep]}
      </p>
    </div>
  );
}
