"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagInputProps {
  label?: string;
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  className?: string;
}

/** Saisie de listes (passions, valeurs, langues...) réutilisée par l'onboarding et les paramètres de profil. */
export function TagInput({ label, placeholder, value, onChange, maxTags = 12, className }: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || value.length >= maxTags) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <label className="text-xs font-medium text-foreground block">{label}</label>}
      <div className="flex flex-wrap items-center gap-1.5 min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs text-foreground"
          >
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
              <X size={11} />
            </button>
          </span>
        ))}
        {value.length < maxTags && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTag(draft)}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-24 bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground focus:outline-none py-1"
          />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground pl-1">Entrée ou virgule pour ajouter — {value.length}/{maxTags}</p>
    </div>
  );
}
