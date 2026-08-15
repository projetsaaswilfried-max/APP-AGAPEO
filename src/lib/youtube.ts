/**
 * Extrait l'identifiant d'une vidéo YouTube depuis n'importe quel format de
 * lien courant (watch, youtu.be, embed, shorts) — pas d'appel API, juste du
 * parsing d'URL, donc aucune clé YouTube nécessaire.
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const isValidId = (id: string | null | undefined): id is string => Boolean(id && /^[a-zA-Z0-9_-]{11}$/.test(id));

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return isValidId(id) ? id : null;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return isValidId(id) ? id : null;
    }
    const embedMatch = url.pathname.match(/^\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[2];
  }

  return null;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
