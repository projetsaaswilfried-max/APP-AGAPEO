/**
 * Catalogue statique pays/réseaux Mobile Money SasPay. Resynchronisé en
 * direct le 2026-09-04 via GET /countries/ et /networks/ (paginé, 61 réseaux)
 * — leur documentation (docs.saspay.me/api-reference/reference/formats) ne
 * liste que 18 pays et s'est avérée périmée : Gabon, Congo-Brazzaville et
 * Mozambique existent bien côté API (confirmés actifs par leur propre page
 * Wallet) mais n'y figurent pas, et plusieurs réseaux manquaient sur des pays
 * déjà listés (Djamo Côte d'Ivoire, Mixx Togo, Djamo/Expresso/PayDunya
 * Sénégal). Ces deux endpoints n'exposent PAS le format de numéro attendu
 * par pays (uniquement l'indicatif retenu ici, standard UIT) — c'est
 * pourquoi ce fichier reste statique plutôt que résolu à la volée.
 * République Centrafricaine (CF) existe comme pays actif côté SasPay mais
 * SANS aucun réseau enregistré (payer y est donc impossible pour l'instant)
 * — volontairement absente de cette liste. À resynchroniser manuellement si
 * SasPay ajoute un pays/réseau. Les réseaux marqués `inactive` existent dans
 * leur catalogue mais ne sont routés vers aucune passerelle pour le moment
 * (rejetés en 422 côté SasPay).
 */
export interface SasPayNetwork {
  code: string;
  label: string;
  inactive?: boolean;
}

export interface SasPayCountry {
  code: string;
  label: string;
  currency: string;
  dialCode: string;
  networks: SasPayNetwork[];
}

export const SASPAY_COUNTRIES: SasPayCountry[] = [
  {
    code: "BJ",
    label: "Bénin",
    currency: "XOF",
    dialCode: "+229",
    networks: [
      { code: "celtiis_bj", label: "Celtiis Cash" },
      { code: "moov_bj", label: "Moov Money" },
      { code: "mtn_bj", label: "MTN MoMo" },
      { code: "coris_bj", label: "Coris Money", inactive: true }
    ]
  },
  {
    code: "CI",
    label: "Côte d'Ivoire",
    currency: "XOF",
    dialCode: "+225",
    networks: [
      { code: "moov_ci", label: "Moov Money" },
      { code: "mtn_ci", label: "MTN MoMo" },
      { code: "orange_ci", label: "Orange Money" },
      { code: "wave_ci", label: "Wave" },
      { code: "djamo_ci", label: "Djamo" }
    ]
  },
  {
    code: "TG",
    label: "Togo",
    currency: "XOF",
    dialCode: "+228",
    networks: [
      { code: "moov_tg", label: "Moov Money" },
      { code: "togocel", label: "Togocel Money" },
      { code: "mixx_tg", label: "Mixx by Yas" }
    ]
  },
  {
    code: "SN",
    label: "Sénégal",
    currency: "XOF",
    dialCode: "+221",
    networks: [
      { code: "orange_sn", label: "Orange Money" },
      { code: "wave_sn", label: "Wave" },
      { code: "freemoney_sn", label: "Free Money" },
      { code: "wizall_sn", label: "Wizall" },
      { code: "djamo_sn", label: "Djamo" },
      { code: "expresso_sn", label: "Expresso" },
      { code: "paydunya_sn", label: "Compte PayDunya" },
      { code: "e_money_sn", label: "E-Money", inactive: true }
    ]
  },
  {
    code: "ML",
    label: "Mali",
    currency: "XOF",
    dialCode: "+223",
    networks: [
      { code: "moov_ml", label: "Moov Money" },
      { code: "orange_ml", label: "Orange Money" },
      { code: "mobi_cash_ml", label: "Mobi Cash" }
    ]
  },
  {
    code: "BF",
    label: "Burkina Faso",
    currency: "XOF",
    dialCode: "+226",
    networks: [
      { code: "moov_bf", label: "Moov Burkina Faso" },
      { code: "orange_bf", label: "Orange Burkina Faso" }
    ]
  },
  {
    code: "NE",
    label: "Niger",
    currency: "XOF",
    dialCode: "+227",
    networks: [{ code: "airtel_ne", label: "Airtel Niger" }]
  },
  {
    code: "CM",
    label: "Cameroun",
    currency: "XAF",
    dialCode: "+237",
    networks: [
      { code: "mtn_cm", label: "MTN MoMo" },
      { code: "orange_cm", label: "Orange Money" },
      { code: "eu_mobile_cm", label: "EU Mobile Money", inactive: true }
    ]
  },
  {
    code: "GA",
    label: "Gabon",
    currency: "XAF",
    dialCode: "+241",
    networks: [{ code: "airtel_ga", label: "Airtel Money" }]
  },
  {
    code: "CG",
    label: "Congo-Brazzaville",
    currency: "XAF",
    dialCode: "+242",
    networks: [
      { code: "airtel_cg", label: "Airtel Money" },
      { code: "mtn_cg", label: "MTN MoMo" }
    ]
  },
  {
    code: "GN",
    label: "Guinée",
    currency: "GNF",
    dialCode: "+224",
    networks: [
      { code: "mtn_gn", label: "MTN MoMo" },
      { code: "orange_gn", label: "Orange Money", inactive: true }
    ]
  },
  {
    code: "CD",
    label: "République Démocratique du Congo",
    currency: "CDF",
    dialCode: "+243",
    networks: [
      { code: "airtel_cd", label: "Airtel Congo" },
      { code: "orange_cd", label: "Orange Congo" },
      { code: "vodacom_cd", label: "Vodacom Congo" }
    ]
  },
  {
    code: "GH",
    label: "Ghana",
    currency: "GHS",
    dialCode: "+233",
    networks: [
      { code: "mtn_gh", label: "MTN MoMo" },
      { code: "tigo_gh", label: "Airtel/Tigo" },
      { code: "vodafone_gh", label: "Vodafone" }
    ]
  },
  {
    code: "NG",
    label: "Nigeria",
    currency: "NGN",
    dialCode: "+234",
    networks: [
      { code: "airtel_ng", label: "Airtel Money" },
      { code: "mtn_ng", label: "MTN" }
    ]
  },
  {
    code: "KE",
    label: "Kenya",
    currency: "KES",
    dialCode: "+254",
    networks: [{ code: "mpesa_ke", label: "M-Pesa" }]
  },
  {
    code: "RW",
    label: "Rwanda",
    currency: "RWF",
    dialCode: "+250",
    networks: [
      { code: "airtel_rw", label: "Airtel Rwanda" },
      { code: "mtn_rw", label: "MTN MoMo" }
    ]
  },
  {
    code: "UG",
    label: "Ouganda",
    currency: "UGX",
    dialCode: "+256",
    networks: [
      { code: "airtel_ug", label: "Airtel Uganda" },
      { code: "mtn_ug", label: "MTN MoMo" }
    ]
  },
  {
    code: "TZ",
    label: "Tanzanie",
    currency: "TZS",
    dialCode: "+255",
    networks: [
      { code: "airtel_tz", label: "Airtel Tanzania" },
      { code: "halopesa_tz", label: "Halopesa" },
      { code: "mpesa_tz", label: "Vodacom Tanzania" },
      { code: "tigo_tz", label: "Tigo Tanzania" }
    ]
  },
  {
    code: "ZM",
    label: "Zambie",
    currency: "ZMW",
    dialCode: "+260",
    networks: [
      { code: "airtel_zm", label: "Airtel Zambia" },
      { code: "mtn_zm", label: "MTN MoMo" },
      { code: "zamtel_zm", label: "Zamtel Kwacha" }
    ]
  },
  {
    code: "MW",
    label: "Malawi",
    currency: "MWK",
    dialCode: "+265",
    networks: [
      { code: "airtel_mw", label: "Airtel Money" },
      { code: "tnm_mw", label: "TNM Mpamba" }
    ]
  },
  {
    code: "MZ",
    label: "Mozambique",
    currency: "MZN",
    dialCode: "+258",
    networks: [
      { code: "movitel_mz", label: "Movitel" },
      { code: "vodacom_mz", label: "M-Pesa (Vodacom)" }
    ]
  }
];

export function findSasPayCountry(code: string): SasPayCountry | undefined {
  return SASPAY_COUNTRIES.find((c) => c.code === code);
}
