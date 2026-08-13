import { Info } from "lucide-react";

interface FileSizeHintProps {
  maxSizeMb: number;
  formats?: string;
}

/** Petite notice de taille max affichée sous chaque zone d'upload de fichier. */
export function FileSizeHint({ maxSizeMb, formats }: FileSizeHintProps) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Info size={12} className="shrink-0" />
      Taille maximale : {maxSizeMb} Mo{formats ? ` — formats acceptés : ${formats}` : ""}
    </p>
  );
}
