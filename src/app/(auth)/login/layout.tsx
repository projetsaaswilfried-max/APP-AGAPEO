import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi à ton compte Agapeo pour retrouver tes échanges et poursuivre tes rencontres.",
  alternates: { canonical: "/login" }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
