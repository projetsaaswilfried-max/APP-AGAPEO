import type { Metadata, Viewport } from "next";
import { Fraunces, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/core/providers/app-provider";
import { SITE_CONFIG } from "@/config/site";
import { MetaPixel } from "@/components/analytics/meta-pixel";

/** Serif d'accent réservée à la landing publique (titres) — le reste de l'app garde la pile sans-serif système. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-landing-serif",
  display: "swap",
  axes: ["opsz", "SOFT"]
});

/** Titres de la landing publique (refonte) — le reste de l'app garde la pile sans-serif système. */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-landing-heading",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: SITE_CONFIG.fullName,
    template: `%s | ${SITE_CONFIG.name}`
  },
  description: SITE_CONFIG.description,
  keywords: ["Mariage chrétien", "Célibataires chrétiens", "Rencontre éthique", "Réseau social chrétien"],
  authors: [{ name: SITE_CONFIG.author }],
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true
    }
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    shortcut: "/icon.png",
    apple: "/icon.png"
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: SITE_CONFIG.fullName,
    description: SITE_CONFIG.description
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.fullName,
    description: SITE_CONFIG.description
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  colorScheme: "light"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`h-full antialiased ${fraunces.variable} ${bricolage.variable}`}>
      <body className="min-h-full bg-background text-foreground font-sans">
        <MetaPixel />
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
