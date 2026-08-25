export type InstallPlatform = "android" | "ios" | "mac-safari" | "other";

/**
 * Détermine comment proposer l'installation selon l'appareil/navigateur.
 * "ios" couvre TOUT navigateur sur iPhone/iPad (Safari, Chrome, Firefox...)
 * car Apple impose le moteur WebKit à tous — aucun n'expose d'API pour
 * déclencher l'installation par code, contrairement à Android/Chrome/Edge.
 */
export function detectInstallPlatform(): InstallPlatform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent;

  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  if (isIos) return "ios";

  if (/Android/.test(ua)) return "android";

  const isMac = ua.includes("Macintosh") && navigator.maxTouchPoints <= 1;
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
  if (isMac && isSafari) return "mac-safari";

  return "other";
}

export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
}
