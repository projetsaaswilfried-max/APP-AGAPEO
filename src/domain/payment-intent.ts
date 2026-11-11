/**
 * Mémorise qu'un paiement vient d'être lancé depuis cet onglet, pour que le
 * veilleur de droits (cf. session-freshness-watcher) relise l'abonnement
 * toutes les quelques secondes au lieu d'une fois par minute pendant la
 * fenêtre où l'activation est attendue.
 *
 * Pourquoi cette fenêtre existe : l'activation n'est jamais instantanée pour
 * le Mobile Money. Mesuré en production le 2026-11-11 sur les 762 paiements
 * SasPay réels des 60 derniers jours — médiane 46 s, 9e décile 106 s, 34 %
 * au-delà d'une minute (Chariow, lui, est instantané : médiane 0 s). Pendant
 * tout ce temps, une interface qui croit encore le membre non abonné lui
 * propose « Passe Premium » alors qu'il vient de payer.
 *
 * `sessionStorage` : cette attente n'a de sens que dans l'onglet qui a lancé
 * le paiement, et ne doit pas survivre à la fermeture du navigateur.
 */
const STORAGE_KEY = "agapeo:payment-pending-since";

/** Au-delà, retour au rythme normal : l'activation a abouti ou a échoué. */
const WINDOW_MS = 10 * 60 * 1000;

export function markPaymentPending(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Stockage indisponible (navigation privée, quota) — le veilleur garde
    // simplement son rythme habituel, rien n'est cassé.
  }
}

export function isPaymentPending(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const since = Number(raw);
    if (!Number.isFinite(since)) return false;
    return Date.now() - since < WINDOW_MS;
  } catch {
    return false;
  }
}

export function clearPaymentPending(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Idem.
  }
}
