"use server";

import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initiateSasPaySoftpay, confirmSasPayOtp, getSasPayPaymentStatus } from "@/lib/saspay";
import { activateSasPayTransaction } from "@/lib/saspay-webhook-handler";
import { getActivePaymentProviderAction } from "@/lib/actions/payment-settings.actions";
import { findSasPayCountry } from "@/config/saspay-networks";
import { PREMIUM_PLANS, PURCHASABLE_PLAN_KEYS, type PremiumPlanKey } from "@/domain/premium-plans";

export interface InitiateMobileMoneyResult {
  error?: string;
  transactionId?: string;
  /** Non vide pour certains réseaux (Wave, Orange Money, Djamo...) — le client doit y être redirigé, aucun push n'arrive sur son téléphone dans ce cas. */
  checkoutUrl?: string | null;
}

/**
 * Lance un paiement Mobile Money DIRECTEMENT depuis notre page (pas de
 * redirection vers une page hébergée SasPay, sauf pour les réseaux qui
 * l'exigent). Réservé au cas où SasPay est le processeur Mobile Money actif
 * (/admin/payments) — c'est le seul des deux à exposer une API de paiement
 * direct ; Chariow n'a qu'un flux de checkout hébergé (aucune alternative,
 * confirmé dans leur documentation complète), donc le choix "Mobile Money"
 * continue de rediriger vers Chariow quand c'est lui l'actif.
 */
export async function initiateMobileMoneyPaymentAction(input: {
  plan: string;
  countryCode: string;
  network: string;
  phone: string;
}): Promise<InitiateMobileMoneyResult> {
  const plan: PremiumPlanKey = PURCHASABLE_PLAN_KEYS.includes(input.plan as PremiumPlanKey) ? (input.plan as PremiumPlanKey) : "MONTHLY";

  const activeProvider = await getActivePaymentProviderAction();
  if (activeProvider !== "saspay") {
    return { error: "Le paiement direct n'est pas disponible pour le moment. Réessaie dans un instant." };
  }

  const country = findSasPayCountry(input.countryCode);
  if (!country) return { error: "Pays non pris en charge pour le Mobile Money." };
  const network = country.networks.find((n) => n.code === input.network && !n.inactive);
  if (!network) return { error: "Opérateur non pris en charge ou temporairement indisponible." };
  if (!input.phone.trim()) return { error: "Numéro de téléphone requis." };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Session expirée, reconnecte-toi." };

  const { data: profile } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single();
  if (!profile) return { error: "Profil introuvable." };

  const planConfig = PREMIUM_PLANS[plan];
  const admin = createAdminClient();

  try {
    const payment = await initiateSasPaySoftpay({
      amountFcfa: planConfig.priceFcfa,
      currency: country.currency,
      countryCode: country.code,
      network: network.code,
      email: user.email,
      firstName: profile.first_name,
      lastName: profile.last_name || "-",
      phone: input.phone.trim(),
      description: `Abonnement Agapeo — ${planConfig.label}`,
      metadata: { agapeo_user_id: user.id, agapeo_plan: plan },
      idempotencyKey: crypto.randomUUID()
    });

    const { error: txError } = await admin.from("transactions").upsert(
      {
        user_id: user.id,
        amount_cents: Math.round(planConfig.priceFcfa * 100),
        currency: country.currency,
        status: "PENDING",
        plan: planConfig.dbValue,
        provider: "saspay",
        provider_reference: payment.id
      },
      { onConflict: "provider,provider_reference" }
    );
    if (txError) return { error: "Le paiement n'a pas pu être initié." };

    return { transactionId: payment.id, checkoutUrl: payment.checkoutUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Le paiement n'a pas pu être initié." };
  }
}

async function loadOwnTransaction(transactionId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." as const };

  const admin = createAdminClient();
  const { data: tx } = await admin
    .from("transactions")
    .select("id, user_id, plan, status, provider_reference")
    .eq("provider", "saspay")
    .eq("provider_reference", transactionId)
    .maybeSingle();

  // Vérifié manuellement (pas de RLS sur `transactions`, verrouillée par
  // défaut, cf. migration d'origine) — un membre ne doit jamais pouvoir
  // interroger ou confirmer le paiement d'un autre.
  if (!tx || tx.user_id !== user.id) return { error: "Paiement introuvable." as const };

  return { tx };
}

export interface MobileMoneyStatusResult {
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  error?: string;
}

/** Sondée par la page de paiement pendant que le client confirme sur son téléphone. */
export async function checkMobileMoneyPaymentStatusAction(transactionId: string): Promise<MobileMoneyStatusResult> {
  const loaded = await loadOwnTransaction(transactionId);
  if ("error" in loaded) return { status: "FAILED", error: loaded.error };
  const { tx } = loaded;

  if (tx.status === "SUCCEEDED") return { status: "SUCCEEDED" };
  if (tx.status === "FAILED") return { status: "FAILED" };

  let payment;
  try {
    payment = await getSasPayPaymentStatus(transactionId);
  } catch {
    return { status: "PENDING" };
  }
  if (!payment) return { status: "PENDING" };

  if (payment.status === "FAILED" || payment.status === "CANCELLED" || payment.status === "EXPIRED") {
    const admin = createAdminClient();
    await admin.from("transactions").update({ status: "FAILED" }).eq("id", tx.id).eq("status", "PENDING");
    return { status: "FAILED" };
  }

  if (payment.status === "SUCCESS") {
    await activateSasPayTransaction({ id: tx.id, user_id: tx.user_id, plan: tx.plan }, payment.requestedAmount);
    return { status: "SUCCEEDED" };
  }

  return { status: "PENDING" };
}

/** Rare — seulement si le client indique avoir reçu un code par SMS (réseaux comme Wizall/Coris, cf. saspay.ts). */
export async function confirmMobileMoneyOtpAction(transactionId: string, otp: string): Promise<MobileMoneyStatusResult> {
  const loaded = await loadOwnTransaction(transactionId);
  if ("error" in loaded) return { status: "FAILED", error: loaded.error };
  const { tx } = loaded;

  try {
    const result = await confirmSasPayOtp(transactionId, otp);
    if (result.status === "SUCCESS") {
      const payment = await getSasPayPaymentStatus(transactionId);
      if (payment) await activateSasPayTransaction({ id: tx.id, user_id: tx.user_id, plan: tx.plan }, payment.requestedAmount);
      return { status: "SUCCEEDED" };
    }
    return { status: "PENDING" };
  } catch (err) {
    return { status: "PENDING", error: err instanceof Error ? err.message : "Code invalide, réessaie." };
  }
}
