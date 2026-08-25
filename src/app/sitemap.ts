import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE_CONFIG.url, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_CONFIG.url}/register`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_CONFIG.url}/login`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_CONFIG.url}/cgv`, lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_CONFIG.url}/mentions-legales`, lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_CONFIG.url}/politique-de-confidentialite`, lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_CONFIG.url}/normes-securite-enfants`, lastModified, changeFrequency: "yearly", priority: 0.2 }
  ];
}
