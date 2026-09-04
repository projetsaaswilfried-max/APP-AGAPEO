"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { setActivePaymentProviderAction } from "@/lib/actions/payment-settings.actions";
import { PAYMENT_PROVIDER_LABELS, PAYMENT_PROVIDER_DESCRIPTIONS, type PaymentProvider } from "@/domain/payment-provider";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

const PROVIDERS: PaymentProvider[] = ["chariow", "saspay"];

export function AdminPaymentSettings({ initialProvider, updatedAt }: { initialProvider: PaymentProvider; updatedAt: string | null }) {
  const [activeProvider, setActiveProvider] = useState(initialProvider);
  const [pendingProvider, setPendingProvider] = useState<PaymentProvider | null>(null);
  const [isSwitching, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirmSwitch = () => {
    if (!pendingProvider) return;
    setError(null);
    startTransition(async () => {
      const result = await setActivePaymentProviderAction(pendingProvider);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setActiveProvider(pendingProvider);
      setPendingProvider(null);
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-base font-display font-semibold text-foreground tracking-tight flex items-center gap-2">
          <CreditCard size={18} className="text-primary" /> Processeur de paiement
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Détermine quel agrégateur encaisse les nouveaux abonnements à partir de maintenant. Les abonnements déjà
          actifs ne sont jamais affectés, quel que soit le processeur qui les a encaissés à l'origine.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PROVIDERS.map((provider) => {
          const isActive = provider === activeProvider;
          return (
            <Card
              key={provider}
              variant="base"
              className={`p-5 space-y-3 shadow-2xs transition-colors ${
                isActive ? "border-2 border-primary" : "border border-border/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-display font-semibold text-foreground">{PAYMENT_PROVIDER_LABELS[provider]}</h3>
                {isActive && (
                  <Badge variant="verified" className="text-[10px]">
                    <CheckCircle2 size={11} /> Actif
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{PAYMENT_PROVIDER_DESCRIPTIONS[provider]}</p>
              <Button
                variant={isActive ? "outline" : "primary"}
                size="sm"
                disabled={isActive}
                onClick={() => setPendingProvider(provider)}
                className="w-full"
              >
                {isActive ? "Déjà actif" : `Activer ${PAYMENT_PROVIDER_LABELS[provider]}`}
              </Button>
            </Card>
          );
        })}
      </div>

      {updatedAt && (
        <p className="text-[11px] text-muted-foreground">
          Dernière modification : {new Date(updatedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      )}

      <Modal
        isOpen={pendingProvider !== null}
        onClose={() => setPendingProvider(null)}
        title="Changer le processeur de paiement"
        description={pendingProvider ? `Basculer vers ${PAYMENT_PROVIDER_LABELS[pendingProvider]} ?` : undefined}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingProvider(null)} disabled={isSwitching}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmSwitch} isLoading={isSwitching}>
              Confirmer le changement
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          À partir de la confirmation, tout nouvel achat d'abonnement passera par{" "}
          {pendingProvider ? PAYMENT_PROVIDER_LABELS[pendingProvider] : ""}. Les paiements déjà en cours sur l'ancien
          processeur ne sont pas affectés — laisse-les se terminer normalement avant de rebasculer si besoin.
        </p>
      </Modal>
    </div>
  );
}
