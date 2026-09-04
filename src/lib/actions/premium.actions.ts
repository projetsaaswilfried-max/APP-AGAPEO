"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PhoneSchema } from "@/lib/validation/profile.schema";
import { initiateChariowCheckout } from "@/lib/chariow";
import { initiateSasPayCheckout } from "@/lib/saspay";
import { getActivePaymentProviderAction } from "@/lib/actions/payment-settings.actions";
import { env, type ChariowPlanKey } from "@/config/env";
import { PURCHASABLE_PLAN_KEYS, PREMIUM_PLANS } from "@/domain/premium-plans";

export type PremiumCheckoutState = { errors?: Record<string, string[]>; message?: string } | undefined;

/**
 * Ouvre un paiement unique d'accès Premium (un des plans proposés à l'achat,
 * cf. le champ caché "plan" porté par chaque formulaire de la page Premium —
 * y compris celui de la modale de récupération du téléphone, qui doit
 * reporter le plan en cours de sélection). Chariow n'a pas de numéro de
 * téléphone enregistré pour un membre qui n'en a jamais renseigné (champ
 * requis par leur API) — le formulaire le demande dans ce cas et
 * l'enregistre sur `profile_private` en même temps, comme le ferait
 * `updatePhoneAction`.
 */
export async function startPremiumCheckoutAction(_prevState: PremiumCheckoutState, formData: FormData): Promise<PremiumCheckoutState> {
  const submittedPlan = formData.get("plan");
  // Seuls les plans réellement en vente (PURCHASABLE_PLAN_KEYS) sont résolus
  // — un plan retiré de la vente (ex: ACCESS) ne peut jamais être racheté
  // même si un vieux formulaire en cache soumettait encore cette valeur.
  const plan: ChariowPlanKey = PURCHASABLE_PLAN_KEYS.includes(submittedPlan as ChariowPlanKey)
    ? (submittedPlan as ChariowPlanKey)
    : "MONTHLY";

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { message: "Session expirée, reconnecte-toi." };

  const [{ data: profile }, { data: privateData }] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single(),
    supabase.from("profile_private").select("phone, phone_country_code").eq("id", user.id).single()
  ]);
  if (!profile) return { message: "Profil introuvable." };

  const activeProvider = await getActivePaymentProviderAction();
  if (activeProvider === "saspay") {
    return startSasPayCheckout({
      userId: user.id,
      email: user.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      phone: privateData?.phone ?? null,
      phoneCountryCode: privateData?.phone_country_code ?? null,
      plan
    });
  }

  let phone = privateData?.phone ?? null;
  let phoneCountryCode = privateData?.phone_country_code ?? null;

  const submittedPhone = formData.get("phone");
  const submittedCountryCode = formData.get("phoneCountryCode");
  if (!phone && submittedPhone) {
    if (!submittedCountryCode) return { errors: { phone: ["Sélectionne l'indicatif du pays."] } };
    const parsed = PhoneSchema.safeParse({ phone: submittedPhone, phone_country_code: submittedCountryCode });
    if (!parsed.success || !parsed.data.phone || !parsed.data.phone_country_code) {
      return { errors: { phone: ["Numéro de téléphone invalide."] } };
    }
    phone = parsed.data.phone;
    phoneCountryCode = parsed.data.phone_country_code;

    await supabase.from("profile_private").update({ phone, phone_country_code: phoneCountryCode }).eq("id", user.id);
  }

  if (!phone || !phoneCountryCode) {
    return { errors: { phone: ["Un numéro de téléphone est requis pour le paiement."] } };
  }

  let checkoutUrl: string | null;
  let alreadyCompleted = false;
  let alreadyPurchased = false;
  try {
    const result = await initiateChariowCheckout({
      plan,
      email: user.email,
      firstName: profile.first_name,
      lastName: profile.last_name || "-",
      phoneNumber: phone,
      phoneCountryCode,
      redirectUrl: `${env.siteUrl}/premium/success`,
      customMetadata: { agapeo_user_id: user.id, agapeo_plan: plan }
    });

    // "completed" = cette session de paiement vient d'aboutir (redirection
    // légitime). "already_purchased" est différent et PIÉGEUX : Chariow
    // bloque tout nouvel achat tant qu'un accès précédent au même produit
    // est encore actif côté Chariow (aucun paiement n'a lieu, checkoutUrl
    // reste null) — les traiter pareil ferait croire à un paiement réussi
    // alors qu'aucune charge n'a eu lieu et que l'abonnement ne sera jamais
    // prolongé. Cf. memory chariow_repurchase_block.md pour le vrai correctif.
    alreadyCompleted = result.step === "completed";
    alreadyPurchased = result.step === "already_purchased";
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Le paiement n'a pas pu être initié." };
  }

  if (alreadyPurchased) {
    return {
      message: "Un souci technique empêche de relancer un nouveau paiement pour l'instant. Contacte le support Agapeo, on va régulariser ton accès manuellement."
    };
  }

  // `redirect()` lève une exception spéciale que Next.js intercepte plus haut
  // dans la pile — jamais à l'intérieur du try/catch ci-dessus, sous peine
  // d'être avalée et traitée comme une vraie erreur.
  if (alreadyCompleted) redirect("/premium/success");
  if (!checkoutUrl) return { message: "Le paiement n'a pas pu être initié." };
  redirect(checkoutUrl);
}

/**
 * Checkout SasPay — pas de téléphone requis en amont contrairement à Chariow
 * (leur page hébergée le demande elle-même, avec le réseau mobile money du
 * client). Après création, la session est stockée en PENDING dans nos
 * `transactions` (provider_reference = id de session) : c'est ce row que la
 * réconciliation (webhook + cron, cf. saspay-webhook-handler.ts et
 * supabase/functions/saspay-payment-reconciliation) retrouvera pour activer
 * l'abonnement — le webhook SasPay lui-même ne porte aucune donnée permettant
 * de remonter jusqu'à ce membre.
 */
async function startSasPayCheckout(input: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  phoneCountryCode: string | null;
  plan: ChariowPlanKey;
}): Promise<PremiumCheckoutState> {
  const planConfig = PREMIUM_PLANS[input.plan];
  let checkoutUrl: string;
  try {
    const session = await initiateSasPayCheckout({
      amountFcfa: planConfig.priceFcfa,
      email: input.email,
      fullName: `${input.firstName} ${input.lastName || ""}`.trim(),
      countryCode: input.phoneCountryCode,
      phoneNumber: input.phone,
      description: `Abonnement Agapeo — ${planConfig.label}`,
      returnUrl: `${env.siteUrl}/premium/success`,
      metadata: { agapeo_user_id: input.userId, agapeo_plan: input.plan }
    });
    if (!session.checkoutUrl) return { message: "Le paiement n'a pas pu être initié." };
    checkoutUrl = session.checkoutUrl;

    const admin = createAdminClient();
    const { error: txError } = await admin.from("transactions").upsert(
      {
        user_id: input.userId,
        amount_cents: Math.round(planConfig.priceFcfa * 100),
        currency: "XOF",
        status: "PENDING",
        plan: planConfig.dbValue,
        provider: "saspay",
        provider_reference: session.id
      },
      { onConflict: "provider,provider_reference" }
    );
    if (txError) return { message: "Le paiement n'a pas pu être initié." };
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Le paiement n'a pas pu être initié." };
  }

  // `redirect()` lève une exception spéciale — jamais à l'intérieur du try/catch ci-dessus.
  redirect(checkoutUrl);
}
