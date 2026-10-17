import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Action discrète à droite du titre (ex. « Tout marquer comme lu »). */
  action?: ReactNode;
  className?: string;
}

/** En-tête de page de l'espace membre : un titre et un léger sous-titre, rien d'autre (règle de design). */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
