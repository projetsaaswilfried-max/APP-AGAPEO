import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/core/providers/app-provider";
import { SITE_CONFIG } from "@/config/site";

/** Serif d'accent réservée à la landing publique (titres) — le reste de l'app garde la pile sans-serif système. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-landing-serif",
  display: "swap",
  axes: ["opsz", "SOFT"]
});

export const metadata: Metadata = {
  title: {
    default: SITE_CONFIG.fullName,
    template: `%s | ${SITE_CONFIG.name}`
  },
  description: SITE_CONFIG.description,
  keywords: ["Mariage chrétien", "Célibataires chrétiens", "Rencontre éthique", "Réseau social chrétien"],
  authors: [{ name: SITE_CONFIG.author }]
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`h-full antialiased ${fraunces.variable}`}>
      <body className="min-h-full bg-background text-foreground font-sans">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
