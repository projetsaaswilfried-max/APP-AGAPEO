"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  initiateMobileMoneyPaymentAction,
  checkMobileMoneyPaymentStatusAction,
  confirmMobileMoneyOtpAction,
  getMobileMoneyPriceQuoteAction
} from "@/lib/actions/mobile-money.actions";
import { SASPAY_COUNTRIES, findSasPayCountry } from "@/config/saspay-networks";
import { PREMIUM_PLANS, type PremiumPlanKey } from "@/domain/premium-plans";
import { Loader2, CheckCircle2, AlertCircle, Smartphone } from "lucide-react";

interface MobileMoneyCheckoutModalProps {
  plan: PremiumPlanKey | null;
  onClose: () => void;
}

type Step = "form" | "waiting" | "success" | "failed";

const POLL_INTERVAL_MS = 4000;

export function MobileMoneyCheckoutModal({ plan, onClose }: MobileMoneyCheckoutModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [countryCode, setCountryCode] = useState("BJ");
  const [network, setNetwork] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [priceQuote, setPriceQuote] = useState<{ amount: number; currency: string } | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const country = findSasPayCountry(countryCode);

  useEffect(() => {
    if (plan) {
      setStep("form");
      setCountryCode("BJ");
      setNetwork("");
      setPhone("");
      setOtp("");
      setShowOtpInput(false);
      setError(null);
      setTransactionId(null);
    }
  }, [plan]);

  // Le montant réellement facturé dépend du pays choisi — SasPay facture dans
  // sa devise locale, pas systématiquement en FCFA (cf. src/lib/fx-rates.ts).
  // Sans cet aperçu, "2 335 FCFA" resterait affiché même pour un pays dont la
  // charge réelle est en Cedi, Naira, Shilling... ce qui induirait en erreur.
  useEffect(() => {
    if (!plan) return;
    let cancelled = false;
    setIsQuoteLoading(true);
    getMobileMoneyPriceQuoteAction(plan, countryCode).then((result) => {
      if (cancelled) return;
      setIsQuoteLoading(false);
      setPriceQuote(result.amount !== undefined && result.currency ? { amount: result.amount, currency: result.currency } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [plan, countryCode]);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    []
  );

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (txId: string) => {
    pollRef.current = setInterval(async () => {
      const result = await checkMobileMoneyPaymentStatusAction(txId);
      if (result.status === "SUCCEEDED") {
        stopPolling();
        setStep("success");
      } else if (result.status === "FAILED") {
        stopPolling();
        setError(result.error ?? "Le paiement a échoué ou a été annulé.");
        setStep("failed");
      }
    }, POLL_INTERVAL_MS);
  };

  const handleSubmit = async () => {
    if (!plan) return;
    if (!network) {
      setError("Choisis ton opérateur.");
      return;
    }
    if (!phone.trim()) {
      setError("Renseigne ton numéro de téléphone.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const result = await initiateMobileMoneyPaymentAction({ plan, countryCode, network, phone: phone.trim() });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return;
    }
    if (result.transactionId) {
      setTransactionId(result.transactionId);
      setStep("waiting");
      startPolling(result.transactionId);
    }
  };

  const handleConfirmOtp = async () => {
    if (!transactionId || !otp.trim()) return;
    setIsSubmitting(true);
    const result = await confirmMobileMoneyOtpAction(transactionId, otp.trim());
    setIsSubmitting(false);
    if (result.status === "SUCCEEDED") {
      stopPolling();
      setStep("success");
    } else if (result.error) {
      setError(result.error);
    }
  };

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  return (
    <Modal isOpen={plan !== null} onClose={handleClose} title="Payer par Mobile Money" maxWidth="sm">
      {step === "form" && (
        <div className="space-y-3">
          {plan && (
            <p className="text-xs text-muted-foreground">
              {PREMIUM_PLANS[plan].label} —{" "}
              {isQuoteLoading
                ? "calcul du montant..."
                : priceQuote
                  ? `${priceQuote.amount.toLocaleString("fr-FR")} ${priceQuote.currency === "XOF" || priceQuote.currency === "XAF" ? "FCFA" : priceQuote.currency}`
                  : PREMIUM_PLANS[plan].priceFcfaLabel}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground pl-1">Pays</label>
            <select
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                setNetwork("");
              }}
              className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SASPAY_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground pl-1">Opérateur</label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— Sélectionner —</option>
              {country?.networks
                .filter((n) => !n.inactive)
                .map((n) => (
                  <option key={n.code} value={n.code}>
                    {n.label}
                  </option>
                ))}
            </select>
          </div>

          <Input
            label={`Numéro de téléphone (${country?.dialCode ?? ""})`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0197505050"
          />

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            className="w-full"
            isLoading={isSubmitting}
            onClick={handleSubmit}
            leftIcon={<Smartphone size={16} />}
          >
            Payer maintenant
          </Button>
        </div>
      )}

      {step === "waiting" && (
        <div className="space-y-4 text-center py-4">
          <Loader2 size={32} className="animate-spin text-primary mx-auto" />
          <div>
            <p className="text-sm font-semibold text-foreground">Vérifie ton téléphone</p>
            <p className="text-xs text-muted-foreground mt-1">
              Une demande de paiement vient d&apos;être envoyée — confirme-la (validation USSD ou code secret) pour
              activer ton abonnement. Cette page se met à jour automatiquement.
            </p>
          </div>
          {!showOtpInput ? (
            <button type="button" onClick={() => setShowOtpInput(true)} className="text-xs text-accent underline underline-offset-2">
              J&apos;ai reçu un code par SMS
            </button>
          ) : (
            <div className="space-y-2 text-left">
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Code reçu par SMS" />
              <Button type="button" variant="outline" size="sm" className="w-full" isLoading={isSubmitting} onClick={handleConfirmOtp}>
                Confirmer le code
              </Button>
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      {step === "success" && (
        <div className="space-y-3 text-center py-4">
          <CheckCircle2 size={40} className="text-emerald-600 mx-auto" />
          <p className="text-sm font-semibold text-foreground">Paiement confirmé !</p>
          <p className="text-xs text-muted-foreground">Ton abonnement Premium est actif.</p>
          <Button type="button" variant="primary" className="w-full" onClick={() => (window.location.href = "/premium")}>
            Continuer
          </Button>
        </div>
      )}

      {step === "failed" && (
        <div className="space-y-3 text-center py-4">
          <AlertCircle size={40} className="text-destructive mx-auto" />
          <p className="text-sm font-semibold text-foreground">Le paiement n&apos;a pas abouti</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button type="button" variant="outline" className="w-full" onClick={() => setStep("form")}>
            Réessayer
          </Button>
        </div>
      )}
    </Modal>
  );
}
