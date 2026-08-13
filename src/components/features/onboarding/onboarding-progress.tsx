import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
  currentStep: number;
  labels: string[];
  /** Fourni = étapes cliquables (navigation libre, ex: revenir corriger une section déjà remplie). */
  onStepClick?: (step: number) => void;
}

export function OnboardingProgress({ currentStep, labels, onStepClick }: OnboardingProgressProps) {
  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center gap-1.5">
        {labels.map((label, index) =>
          onStepClick ? (
            <button
              key={label}
              type="button"
              onClick={() => onStepClick(index)}
              title={label}
              aria-label={`Aller à l'étape ${index + 1} : ${label}`}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors cursor-pointer",
                index <= currentStep ? "bg-primary" : "bg-secondary hover:bg-secondary/70"
              )}
            />
          ) : (
            <div
              key={label}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index <= currentStep ? "bg-primary" : "bg-secondary"
              )}
            />
          )
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Étape {currentStep + 1} sur {labels.length} — {labels[currentStep]}
      </p>
    </div>
  );
}
