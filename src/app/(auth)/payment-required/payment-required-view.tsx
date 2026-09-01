"use client";

import { useActionState, useEffect, useState } from "react";
import { startPremiumCheckoutAction, type PremiumCheckoutState } from "@/lib/actions/premium.actions";
import { signOutAction } from "@/lib/actions/auth.actions";
import { PHONE_COUNTRY_CODES } from "@/config/phone-country-codes";
import { PREMIUM_PLANS } from "@/domain/premium-plans";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ShieldCheck, HeartHandshake, Lock, Crown, AlertCircle } from "lucide-react";

const initialState: PremiumCheckoutState = undefined;

const REASSURANCES = [
  { icon: ShieldCheck, text: "Profils vérifiés manuellement par notre équipe avant d'apparaître sur la plateforme." },
  { icon: HeartHandshake, text: "Une communauté engagée, exclusivement composée de célibataires chrétiens sérieux dans leur recherche." },
  { icon: Lock, text: "Paiement sécurisé — ton accès s'active automatiquement dès la confirmation du paiement." }
];

export function PaymentRequiredView() {
  const [state, action, pending] = useActionState(startPremiumCheckoutAction, initialState);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  useEffect(() => {
    if (state?.errors?.phone) setIsPhoneModalOpen(true);
  }, [state]);

  return (
    <div className="w-full max-w-lg mx-auto py-6 space-y-4">
      <Card variant="base">
        <CardContent className="space-y-5 py-8">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Crown size={22} />
            </div>
            <h1 className="text-base font-display font-semibold text-foreground">Achat d&apos;accès à Agapeo obligatoire</h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Un accès complet de 30 jours pour rencontrer des personnes dans le cadre de ton choix de partenaire, en
              toute sérénité.
            </p>
          </div>

          <ul className="space-y-3">
            {REASSURANCES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-xs text-foreground/90">
                <Icon size={16} className="text-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>

          {state?.message && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              <AlertCircle size={15} className="shrink-0" />
              {state.message}
            </div>
          )}

          <form action={action} className="pt-2 border-t border-border/40 space-y-2">
            <input type="hidden" name="plan" value="ACCESS" />
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={pending} leftIcon={<Crown size={16} />}>
              Débloquer mon accès — {PREMIUM_PLANS.ACCESS.priceFcfaLabel}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">Valable 30 jours, renouvelable à tout moment.</p>
          </form>
        </CardContent>
      </Card>

      <form action={signOutAction} className="text-center">
        <button type="submit" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors">
          Se déconnecter
        </button>
      </form>

      <Modal isOpen={isPhoneModalOpen} onClose={() => setIsPhoneModalOpen(false)} title="Un dernier détail" maxWidth="sm">
        <form action={action} className="space-y-3">
          <input type="hidden" name="plan" value="ACCESS" />
          <p className="text-xs text-muted-foreground">
            Un numéro de téléphone est requis par notre prestataire de paiement pour finaliser ton accès.
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
