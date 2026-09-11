"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useSession } from "@/core/providers/session-provider";
import { isProfileComplete, needsVerificationSubmission } from "@/domain/profile-completeness";
import { PREMIUM_PLANS, PURCHASABLE_PLAN_KEYS, type PremiumPlanKey } from "@/domain/premium-plans";
import { Crown } from "lucide-react";

const STORAGE_KEY = "agapeo:premium-nudge-popup";
// Décidé avec le fondateur : 3 à 5 affichages/jour, espacés dans la journée
// plutôt qu'à chaque navigation (qui rendrait l'app inutilisable). Plafond
// et écart choisis pour tomber dans cette fourchette sur une session active.
const DAILY_CAP = 4;
const MIN_GAP_MS = 60 * 60 * 1000;

interface PopupState {
  date: string;
  count: number;
  lastShownAt: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readState(): PopupState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), count: 0, lastShownAt: 0 };
    const parsed = JSON.parse(raw) as PopupState;
    if (parsed.date !== todayKey()) return { date: todayKey(), count: 0, lastShownAt: 0 };
    return parsed;
  } catch {
    return { date: todayKey(), count: 0, lastShownAt: 0 };
  }
}

function writeState(state: PopupState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Stockage indisponible (navigation privée, quota...) — tant pis, le
    // popup s'affichera simplement un peu plus souvent pour cette personne.
  }
}

/**
 * Popup de relance Premium pour les membres gratuits — affiché au chargement
 * de l'app puis à chaque navigation, mais plafonné et espacé (cf. constantes
 * ci-dessus) pour ne pas rendre l'app inutilisable. Monté une seule fois dans
 * AppShellContent, jamais démonté entre deux pages (cf. app-shell.tsx), donc
 * pas besoin de le rebrancher sur chaque route.
 */
export function PremiumNudgePopup() {
  const { profile } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Même suppression que PremiumUpsellBanner : inutile de pousser
  // l'abonnement à quelqu'un qui n'a pas encore terminé/soumis son profil,
  // ce n'est pas encore le bon moment pour ce message.
  const eligible =
    !profile.is_staff &&
    profile.subscription_status !== "ACTIVE" &&
    isProfileComplete(profile) &&
    !needsVerificationSubmission(profile);

  useEffect(() => {
    if (!eligible) return;
    const state = readState();
    if (state.count >= DAILY_CAP) return;
    if (state.lastShownAt && Date.now() - state.lastShownAt < MIN_GAP_MS) return;

    setIsOpen(true);
    writeState({ date: todayKey(), count: state.count + 1, lastShownAt: Date.now() });
  }, [pathname, eligible]);

  if (!eligible) return null;

  const handlePlanClick = (key: PremiumPlanKey) => {
    setIsOpen(false);
    router.push(`/premium?plan=${key}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Découvre tout Agapeo" maxWidth="sm">
      <div className="flex flex-col gap-4 py-1">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-full bg-primary/10 text-primary shrink-0">
            <Crown size={20} />
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Sur Agapeo, un abonnement Premium te permet de consulter les profils en entier, démarrer des
            conversations, voir qui s&apos;intéresse à toi et utiliser les filtres avancés. Sans lui, ton
            exploration reste très limitée.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {PURCHASABLE_PLAN_KEYS.map((key) => {
            const plan = PREMIUM_PLANS[key];
            return (
              <Button key={key} variant="outline" className="w-full justify-between" onClick={() => handlePlanClick(key)}>
                <span>{plan.label}</span>
                <span className="font-semibold">{plan.priceFcfaLabel}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
