import React from "react";

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

/** Transforme les URLs présentes dans un texte brut en liens cliquables (sans dépendance externe). */
export function linkifyText(text: string, keyPrefix = "link"): React.ReactNode[] {
  return text.split(URL_REGEX).map((part, i) => {
    if (i % 2 !== 1) return part;

    const trailingMatch = part.match(TRAILING_PUNCTUATION);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const urlPart = trailing ? part.slice(0, -trailing.length) : part;
    const href = urlPart.startsWith("http") ? urlPart : `https://${urlPart}`;

    return (
      <React.Fragment key={`${keyPrefix}-${i}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          onClick={(e) => e.stopPropagation()}
          className="text-accent underline underline-offset-2 hover:opacity-80 break-all"
        >
          {urlPart}
        </a>
        {trailing}
      </React.Fragment>
    );
  });
}
