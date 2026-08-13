"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PhoneSchema } from "@/lib/validation/profile.schema";
import { initiateChariowCheckout } from "@/lib/chariow";
import { env } from "@/config/env";

export type PremiumCheckoutState = { errors?: Record<string, string[]>; message?: string } | undefined;

/**
 * Ouvre un paiement unique de 30 jours d'accès Premium. Chariow n'a pas de
 * numéro de téléphone enregistré pour un membre qui n'en a jamais renseigné
 * (champ requis par leur API) — le formulaire le demande dans ce cas et
 * l'enregistre sur `profile_private` en même temps, comme le ferait
 * `updatePhoneAction`.
 */
export async function startPremiumCheckoutAction(_prevState: PremiumCheckoutState, formData: FormData): Promise<PremiumCheckoutState> {
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
      email: user.email,
      firstName: profile.first_name,
      lastName: profile.last_name || "-",
      phoneNumber: phone,
      phoneCountryCode,
      redirectUrl: `${env.siteUrl}/premium/success`,
      customMetadata: { agapeo_user_id: user.id }
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
