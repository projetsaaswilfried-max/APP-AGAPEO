"use client";

import { useActionState, useEffect, useState } from "react";
import { useSession } from "@/core/providers/session-provider";
import { startPremiumCheckoutAction, type PremiumCheckoutState } from "@/lib/actions/premium.actions";
import { PHONE_COUNTRY_CODES } from "@/config/phone-country-codes";
import { PREMIUM_PLANS, planKeyFromDbValue, type PremiumPlanKey } from "@/domain/premium-plans";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { Check, X, Crown, AlertCircle } from "lucide-react";

const initialState: PremiumCheckoutState = undefined;

const FREE_FEATURES = [
  { label: "Créer et compléter son profil", included: true },
  { label: "Être visible dans Découvrir", included: true },
  { label: "Recherche de base (âge, pays, statut)", included: true },
  { label: "Consulter 10 profils par mois", included: true },
  { label: "Recevoir des messages", included: true },
  { label: "Vérification de profil sous 48h", included: true },
  { label: "Envoyer jusqu'à 3 invitations par mois", included: true },
  { label: "2 photos de profil", included: true },
  { label: "Envoyer des messages", included: false },
  { label: "Mettre des profils en favori", included: false },
  { label: "Voir qui s'intéresse à toi", included: false },
  { label: "Filtres de recherche avancés", included: false },
  { label: "Profil mis en avant dans Découvrir", included: false }
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
  MONTHLY: `${PREMIUM_PLANS.MONTHLY.priceFcfaLabel} / mois — renouvelable à tout moment.`,
  QUARTERLY: `${PREMIUM_PLANS.QUARTERLY.priceFcfaLabel} / 3 mois (au lieu de 20 997 FCFA) — soit environ 5 832 FCFA/mois.`
};

const BUY_LABELS: Record<PremiumPlanKey, string> = {
  MONTHLY: `S'abonner — ${PREMIUM_PLANS.MONTHLY.priceFcfaLabel} / mois`,
  QUARTERLY: `S'abonner — ${PREMIUM_PLANS.QUARTERLY.priceFcfaLabel} / 3 mois`
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
                Se réabonner
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
  const currentPlanKey = planKeyFromDbValue(profile.subscription_plan);
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

  return (
    <div className="space-y-6 w-full pb-16 select-none">
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">Mon Plan</h1>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
          {isPremium && periodEndLabel
            ? `Ton accès Premium est actif jusqu'au ${periodEndLabel}.`
            : "Compare les plans et débloque tout le potentiel d'Agapeo."}
        </p>
      </div>

      {state?.message && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          {state.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Carte Gratuit */}
        <Card variant="base" className="p-6 space-y-5 border-border/60 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-display font-semibold text-foreground tracking-tight">Gratuit</h2>
              <p className="text-xs text-muted-foreground mt-0.5">L&apos;essentiel pour commencer ta recherche.</p>
            </div>
            {!isPremium && (
              <Badge variant="status" className="text-xs shrink-0">
                Plan actuel
              </Badge>
            )}
          </div>

          <ul className="space-y-2.5 flex-1">
            {FREE_FEATURES.map(({ label, included }) => (
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
            {isPremium ? "Inclus dans ton abonnement Premium." : "Choisis un plan Premium ci-contre pour débloquer plus."}
          </p>
        </Card>

        <PremiumPlanCard
          planKey="MONTHLY"
          isCurrentPlan={isPremium && currentPlanKey === "MONTHLY"}
          isExpiringSoon={isExpiringSoon}
          daysUntilExpiry={daysUntilExpiry}
          pending={pending}
          action={action}
          onSelectPlan={setSelectedPlan}
        />

        <PremiumPlanCard
          planKey="QUARTERLY"
          recommended
          isCurrentPlan={isPremium && currentPlanKey === "QUARTERLY"}
          isExpiringSoon={isExpiringSoon}
          daysUntilExpiry={daysUntilExpiry}
          pending={pending}
          action={action}
          onSelectPlan={setSelectedPlan}
        />
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
