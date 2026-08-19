import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer mon profil",
  description: "Crée gratuitement ton profil sur Agapeo et commence à rencontrer des célibataires chrétiens qui partagent ta foi et tes valeurs.",
  alternates: { canonical: "/register" }
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
