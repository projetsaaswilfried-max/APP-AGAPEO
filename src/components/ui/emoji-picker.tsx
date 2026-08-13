"use client";

import { useMemo, useState } from "react";
import { Smile, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMOJI_CATEGORIES } from "@/domain/emoji-data";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

/** Sélecteur d'emojis complet (sans dépendance externe) : catégories + recherche par mot-clé. */
export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis ?? [];
    return EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter(
      (e) => e.keywords.includes(q) || e.char === q
    );
  }, [query, activeCategory]);

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors shrink-0"
        title="Insérer un emoji"
      >
        <Smile size={18} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div className="absolute bottom-full right-0 mb-2 flex flex-col bg-card border border-border rounded-2xl shadow-xl z-40 w-[min(18rem,calc(100vw-2rem))] h-80 overflow-hidden">
            {/* Recherche */}
            <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-border/60 shrink-0">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un emoji..."
                className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Grille d'emojis */}
            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-7 gap-0.5 content-start">
              {results.length > 0 ? (
                results.map((e, i) => (
                  <button
                    key={`${e.char}-${i}`}
                    type="button"
                    onClick={() => {
                      onSelect(e.char);
                      close();
                    }}
                    title={e.keywords}
                    className="text-lg p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  >
                    {e.char}
                  </button>
                ))
              ) : (
                <p className="col-span-7 text-center text-xs text-muted-foreground py-6">
                  Aucun résultat pour « {query} »
                </p>
              )}
            </div>

            {/* Onglets de catégories */}
            {!query && (
              <div className="flex items-center gap-0.5 px-1.5 py-1.5 border-t border-border/60 overflow-x-auto shrink-0">
                {EMOJI_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCategory(c.id)}
                    title={c.label}
                    className={cn(
                      "shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors",
                      activeCategory === c.id ? "bg-secondary" : "hover:bg-secondary/50"
                    )}
                  >
                    {c.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
