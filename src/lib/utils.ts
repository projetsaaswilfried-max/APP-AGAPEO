import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Masque une valeur pour un aperçu non vérifié — garde les `visibleChars` premiers caractères, remplace le reste par des astérisques (préserve la longueur apparente). */
export function maskForPreview(value: string, visibleChars = 0): string {
  if (!value) return value;
  const visible = value.slice(0, visibleChars);
  const masked = "*".repeat(Math.max(value.length - visibleChars, 0));
  return visible + masked;
}
