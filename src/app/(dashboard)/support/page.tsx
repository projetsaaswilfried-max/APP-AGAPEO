"use client";

import { SupportPageClient } from "@/components/features/support/support-page-client";

export default function SupportPage() {
  return (
    <div className="space-y-4 w-full h-full flex flex-col pb-4">
      <div className="border-b border-border/60 pb-3">
        <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">Support</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Une question, un souci ? Ouvre un dossier, l&apos;équipe Agapeo te répond directement dedans.</p>
      </div>

      <div className="flex-1 min-h-[70dvh]">
        <SupportPageClient />
      </div>
    </div>
  );
}
