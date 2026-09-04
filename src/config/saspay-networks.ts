/**
 * Catalogue statique pays/réseaux Mobile Money SasPay — copié depuis leur
 * documentation (docs.saspay.me/api-reference/reference/formats), seule
 * source qui expose à la fois les codes `network` ET le format de numéro
 * attendu par pays (les endpoints /countries/ et /networks/ n'exposent pas
 * ce dernier). À resynchroniser manuellement si SasPay ajoute un pays/réseau
 * — pas d'API pour le faire automatiquement sans perdre cette information.
 * Les réseaux marqués `inactive` existent dans leur catalogue mais ne sont
 * routés vers aucune passerelle pour le moment (rejetés en 422 côté SasPay).
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
      { code: "mtn_bj", label: "MTN MoMo" }
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
      { code: "wave_ci", label: "Wave" }
    ]
  },
  {
    code: "TG",
    label: "Togo",
    currency: "XOF",
    dialCode: "+228",
    networks: [
      { code: "moov_tg", label: "Moov Money" },
      { code: "togocel", label: "Togocel Money" }
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
  }
];

export function findSasPayCountry(code: string): SasPayCountry | undefined {
  return SASPAY_COUNTRIES.find((c) => c.code === code);
}
