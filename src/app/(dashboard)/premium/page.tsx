"use client";

import { useActionState, useEffect, useState } from "react";
import { useSession } from "@/core/providers/session-provider";
import { startPremiumCheckoutAction, type PremiumCheckoutState } from "@/lib/actions/premium.actions";
import { PHONE_COUNTRY_CODES } from "@/config/phone-country-codes";
import { PREMIUM_PLANS, PURCHASABLE_PLAN_KEYS, planKeyFromDbValue, type PremiumPlanKey } from "@/domain/premium-plans";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Check, X, Crown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: PremiumCheckoutState = undefined;

// Membres déjà présents avant le pivot paywall (payment_required = false) —
// gardent EXACTEMENT leur ancien plan gratuit, jamais la carte restreinte
// ci-dessous. Ne jamais modifier ces libellés sans revalider ce principe.
const FREE_FEATURES = [
  { label: "Créer et compléter son profil", included: true },
  { label: "Être visible dans Découvrir", included: true },
  { label: "Consulter 10 profils par mois", included: true },
  { label: "Recevoir des messages", included: true },
  { label: "Vérification de profil sous 48h", included: true },
  { label: "2 photos de profil", included: true },
  { label: "Rechercher / filtrer les profils", included: false },
  { label: "Envoyer des invitations", included: false },
  { label: "Envoyer des messages", included: false },
  { label: "Mettre des profils en favori", included: false },
  { label: "Voir qui s'intéresse à toi", included: false },
  { label: "Profil mis en avant dans Découvrir", included: false }
];

// Nouvelle cohorte (payment_required = true) sans accès actif — n'a jamais eu
// la grâce de l'ancien plan gratuit : un seul avantage reste accessible,
// tout le reste exige de débloquer l'accès complet.
const RESTRICTED_FEATURES = [
  { label: "Accéder aux ressources d'enseignement (fil d'actualité)", included: true },
  { label: "Parcourir Découvrir et consulter des profils", included: false },
  { label: "Envoyer des invitations", included: false },
  { label: "Envoyer et recevoir des messages", included: false },
  { label: "Répondre à un message ou accepter une invitation", included: false },
  { label: "Mettre des profils en favori", included: false },
  { label: "Contacter le support", included: false }
];

const PREMIUM_FEATURES = [
  "Tout ce qui est inclus dans le plan Gratuit",
  "Consultation illimitée de profils",
  "Invitations illimitées et envoi de messages",
  "10 photos de profil",
  "Mettre des profils en favori",
  "Voir qui a consulté ou mis ton profil en favori",
  "Filtres de recherche avancés (ville, confession, engagement, profession, centres d'intérêt...)",
  "Profil mis en avant dans Découvrir",
  "Vérification de profil accélérée (moins de 24h)"
];

const PRICE_NOTES: Record<PremiumPlanKey, string> = {
  WEEKLY: `${PREMIUM_PLANS.WEEKLY.priceFcfaLabel} / 7 jours — renouvelable à tout moment.`,
  HALF_MONTH: `${PREMIUM_PLANS.HALF_MONTH.priceFcfaLabel} / 15 jours — renouvelable à tout moment.`,
  MONTHLY: `${PREMIUM_PLANS.MONTHLY.priceFcfaLabel} / mois — renouvelable à tout moment.`,
  QUARTERLY: `${PREMIUM_PLANS.QUARTERLY.priceFcfaLabel} / 3 mois (au lieu de 20 997 FCFA) — soit environ 5 832 FCFA/mois.`,
  ACCESS: `${PREMIUM_PLANS.ACCESS.priceFcfaLabel} / 30 jours — renouvelable à tout moment.`
};

const BUY_LABELS: Record<PremiumPlanKey, string> = {
  WEEKLY: `S'abonner — ${PREMIUM_PLANS.WEEKLY.priceFcfaLabel}`,
  HALF_MONTH: `S'abonner — ${PREMIUM_PLANS.HALF_MONTH.priceFcfaLabel}`,
  MONTHLY: `S'abonner — ${PREMIUM_PLANS.MONTHLY.priceFcfaLabel}`,
  QUARTERLY: `S'abonner — ${PREMIUM_PLANS.QUARTERLY.priceFcfaLabel}`,
  ACCESS: `S'abonner — ${PREMIUM_PLANS.ACCESS.priceFcfaLabel}`
};

interface PremiumPlanCardProps {
  planKey: PremiumPlanKey;
  recommended?: boolean;
  isCurrentPlan: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
  pending: boolean;
  action: (formData: FormData) => void;
  onSelectPlan: (plan: PremiumPlanKey) => void;
}

function PremiumPlanCard({ planKey, recommended, isCurrentPlan, isExpiringSoon, daysUntilExpiry, pending, action, onSelectPlan }: PremiumPlanCardProps) {
  return (
    <Card
      variant="base"
      className={cn(
        "p-6 space-y-5 flex flex-col relative overflow-hidden",
        recommended ? "border-primary/50 shadow-accent-glow ring-2 ring-primary/25" : "border-primary/30 shadow-accent-glow"
      )}
    >
      {recommended && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
          Recommandé
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-display font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Crown size={18} className="text-primary" /> {PREMIUM_PLANS[planKey].label}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{PRICE_NOTES[planKey]}</p>
        </div>
        {isCurrentPlan && (
          <Badge variant="premium" className="text-xs shrink-0">
            <Crown size={12} className="mr-1" /> Plan actuel
          </Badge>
        )}
      </div>

      {isCurrentPlan && daysUntilExpiry !== null && (
        <div className="text-center py-3 rounded-2xl bg-secondary/50 border border-border/40">
          <p className="text-2xl font-display font-bold text-foreground tabular-nums">
            -{Math.max(daysUntilExpiry, 0)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              jour{Math.max(daysUntilExpiry, 0) > 1 ? "s" : ""} restant{Math.max(daysUntilExpiry, 0) > 1 ? "s" : ""}
            </span>
          </p>
        </div>
      )}

      <ul className="space-y-2.5 flex-1">
        {PREMIUM_FEATURES.map((label) => (
          <li key={label} className="flex items-start gap-2.5 text-xs text-foreground/90">
            <Check size={15} className="text-primary shrink-0 mt-0.5" />
            <span>{label}</span>
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        isExpiringSoon ? (
          <div className="pt-2 border-t border-border/40 space-y-2">
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center font-medium">
              {daysUntilExpiry !== null && daysUntilExpiry <= 0
                ? "Ton abonnement expire aujourd'hui"
                : `Expire dans ${daysUntilExpiry} jour${daysUntilExpiry! > 1 ? "s" : ""}`}
            </p>
            <form action={action} onSubmit={() => onSelectPlan(planKey)}>
              <input type="hidden" name="plan" value={planKey} />
              <Button type="submit" variant="primary" className="w-full" isLoading={pending} leftIcon={<Crown size={15} />}>
                Renouveler ce plan
              </Button>
            </form>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/40">
            Merci pour ta confiance — profite de tous tes avantages Premium.
          </p>
        )
      ) : (
        <form action={action} onSubmit={() => onSelectPlan(planKey)} className="pt-2 border-t border-border/40">
          <input type="hidden" name="plan" value={planKey} />
          <Button type="submit" variant="primary" className="w-full" isLoading={pending} leftIcon={<Crown size={15} />}>
            {BUY_LABELS[planKey]}
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function PremiumPage() {
  const { profile } = useSession();
  const isPremium = profile.subscription_status === "ACTIVE";
  const isExpired = profile.subscription_status === "EXPIRED";
  const currentPlanKey = planKeyFromDbValue(profile.subscription_plan);
  // Un abonné actif sur un plan retiré de la vente (ex: ACCESS) n'a aucune
  // des 4 cartes ci-dessous qui lui corresponde — on lui affiche son plan
  // réel en plus, sans bouton d'achat (le renouvellement se fait via l'un
  // des plans proposés ci-dessous, jamais en rachetant l'ancien).
  const legacyCurrentPlanKey = isPremium && currentPlanKey && !PURCHASABLE_PLAN_KEYS.includes(currentPlanKey) ? currentPlanKey : null;
  const [state, action, pending] = useActionState(startPremiumCheckoutAction, initialState);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlanKey>("MONTHLY");

  useEffect(() => {
    if (state?.errors?.phone) setIsPhoneModalOpen(true);
  }, [state]);

  const periodEndLabel = profile.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const daysUntilExpiry = profile.subscription_current_period_end
    ? Math.ceil((new Date(profile.subscription_current_period_end).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
    : null;
  // "5 jours avant jusqu'au jour J" — daysUntilExpiry peut être 0 (jour J) ou négatif si le cron n'est pas encore passé.
  const isExpiringSoon = isPremium && daysUntilExpiry !== null && daysUntilExpiry <= 5;
  // Carte "Gratuit" : un membre déjà présent avant le pivot garde l'ancien
  // plan gratuit tel quel (jamais la carte restreinte) — cf. FREE_FEATURES.
  const freeCardFeatures = profile.payment_required ? RESTRICTED_FEATURES : FREE_FEATURES;

  return (
    <div className="space-y-6 w-full pb-16 select-none">
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">Mon Plan</h1>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
          {isPremium && periodEndLabel
            ? `Ton accès est actif jusqu'au ${periodEndLabel}.`
            : isExpired
              ? "Ton accès a expiré — réactive-le pour retrouver toutes tes fonctionnalités."
              : "Débloque tout le potentiel d'Agapeo."}
        </p>
      </div>

      {state?.message && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          {state.message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Carte Gratuit */}
        <Card variant="base" className="p-6 space-y-5 border-border/60 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-display font-semibold text-foreground tracking-tight">Gratuit</h2>
              <p className="text-xs text-muted-foreground mt-0.5">L&apos;essentiel pour commencer ta recherche.</p>
            </div>
            {!isPremium && !isExpired && (
              <Badge variant="status" className="text-xs shrink-0">
                Plan actuel
              </Badge>
            )}
          </div>

          <ul className="space-y-2.5 flex-1">
            {freeCardFeatures.map(({ label, included }) => (
              <li key={label} className="flex items-start gap-2.5 text-xs">
                {included ? (
                  <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <X size={15} className="text-muted-foreground/50 shrink-0 mt-0.5" />
                )}
                <span className={included ? "text-foreground/90" : "text-muted-foreground/70 line-through"}>{label}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/40">
            {isPremium
              ? "Inclus dans ton accès actif."
              : profile.payment_required
                ? "Débloque ton accès pour tout retrouver."
                : "Choisis un plan ci-contre pour débloquer plus."}
          </p>
        </Card>

        {legacyCurrentPlanKey && (
          <Card variant="base" className="p-6 space-y-5 flex flex-col relative overflow-hidden border-primary/30 shadow-accent-glow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-display font-semibold text-foreground tracking-tight flex items-center gap-2">
                  <Crown size={18} className="text-primary" /> {PREMIUM_PLANS[legacyCurrentPlanKey].label}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{PRICE_NOTES[legacyCurrentPlanKey]}</p>
              </div>
              <Badge variant="premium" className="text-xs shrink-0">
                <Crown size={12} className="mr-1" /> Plan actuel
              </Badge>
            </div>

            {daysUntilExpiry !== null && (
              <div className="text-center py-3 rounded-2xl bg-secondary/50 border border-border/40">
                <p className="text-2xl font-display font-bold text-foreground tabular-nums">
                  -{Math.max(daysUntilExpiry, 0)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    jour{Math.max(daysUntilExpiry, 0) > 1 ? "s" : ""} restant{Math.max(daysUntilExpiry, 0) > 1 ? "s" : ""}
                  </span>
                </p>
              </div>
            )}

            <ul className="space-y-2.5 flex-1">
              {PREMIUM_FEATURES.map((label) => (
                <li key={label} className="flex items-start gap-2.5 text-xs text-foreground/90">
                  <Check size={15} className="text-primary shrink-0 mt-0.5" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>

            <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/40">
              Ce plan n&apos;est plus proposé à l&apos;achat — choisis l&apos;un des plans ci-contre pour renouveler ton accès à son échéance.
            </p>
          </Card>
        )}

        {PURCHASABLE_PLAN_KEYS.map((planKey) => (
          <PremiumPlanCard
            key={planKey}
            planKey={planKey}
            recommended={planKey === "QUARTERLY"}
            isCurrentPlan={isPremium && currentPlanKey === planKey}
            isExpiringSoon={isExpiringSoon}
            daysUntilExpiry={daysUntilExpiry}
            pending={pending}
            action={action}
            onSelectPlan={setSelectedPlan}
          />
        ))}
      </div>

      <Modal isOpen={isPhoneModalOpen} onClose={() => setIsPhoneModalOpen(false)} title="Un dernier détail" maxWidth="sm">
        <form action={action} className="space-y-3">
          <input type="hidden" name="plan" value={selectedPlan} />
          <p className="text-xs text-muted-foreground">
            Un numéro de téléphone est requis par notre prestataire de paiement pour finaliser ton abonnement.
          </p>
          <div className="grid grid-cols-[9.5rem_1fr] gap-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground pl-1">Indicatif</label>
              <select
                name="phoneCountryCode"
                required
                defaultValue=""
                className="w-full h-11 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  —
                </option>
                {PHONE_COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Numéro de téléphone" name="phone" placeholder="0102030405" error={state?.errors?.phone?.[0]} required />
          </div>
          <Button type="submit" variant="primary" className="w-full" isLoading={pending} leftIcon={<Crown size={15} />}>
            Continuer
          </Button>
        </form>
      </Modal>
    </div>
  );
}
