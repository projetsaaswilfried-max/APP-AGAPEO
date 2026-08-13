"use client";

import { useActionState } from "react";
import { UserProfile } from "@/domain/types/user";
import { startPremiumCheckoutAction, type PremiumCheckoutState } from "@/lib/actions/premium.actions";
import { PHONE_COUNTRY_CODES } from "@/config/phone-country-codes";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, MessageCircle, Eye, SlidersHorizontal, ShieldCheck, AlertCircle, CalendarClock } from "lucide-react";

interface AccountPremiumProps {
  profile: UserProfile;
}

const initialState: PremiumCheckoutState = undefined;

const BENEFITS = [
  { icon: ShieldCheck, text: "Vérification de profil accélérée (moins de 24h)" },
  { icon: MessageCircle, text: "Initie la conversation en priorité" },
  { icon: Eye, text: "Découvre qui a consulté ou favori ton profil" },
  { icon: SlidersHorizontal, text: "Filtres de recherche avancés dans Découvrir" }
];

export function AccountPremium({ profile }: AccountPremiumProps) {
  const [state, action, pending] = useActionState(startPremiumCheckoutAction, initialState);

  const isActive = profile.subscriptionStatus === "ACTIVE";
  const needsPhone = !profile.phone;
  const periodEndLabel = profile.subscriptionCurrentPeriodEnd
    ? new Date(profile.subscriptionCurrentPeriodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="space-y-6 select-none">
      <Card variant="base" className="p-6 space-y-5 border-border/60 shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="text-base font-display font-semibold text-foreground tracking-tight">Agapeo Premium</h2>
          </div>
          <Badge variant={isActive ? "premium" : "status"} className="text-xs">
            {isActive ? "Actif" : "Compte gratuit"}
          </Badge>
        </div>

        {isActive ? (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-accent-subtle/60 border border-accent/20 text-xs text-primary">
            <CalendarClock size={16} className="shrink-0" />
            {periodEndLabel ? `Ton accès Premium est actif jusqu'au ${periodEndLabel}.` : "Ton accès Premium est actif."}
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-xs text-foreground/90">
                  <span className="p-1.5 rounded-full bg-accent-subtle/60 text-primary shrink-0">
                    <Icon size={13} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <form action={action} className="space-y-3 pt-2 border-t border-border/40">
              {needsPhone && (
                <div className="grid grid-cols-[9.5rem_1fr] gap-2 pt-3">
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
              )}

              {state?.message && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                  <AlertCircle size={14} className="shrink-0" />
                  {state.message}
                </div>
              )}
              {!needsPhone && state?.errors?.phone?.[0] && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                  <AlertCircle size={14} className="shrink-0" />
                  {state.errors.phone[0]}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" isLoading={pending} leftIcon={<Crown size={15} />}>
                S&apos;abonner — 12$ / mois
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Paiement unique valable 30 jours, renouvelable à tout moment depuis cette page.
              </p>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
