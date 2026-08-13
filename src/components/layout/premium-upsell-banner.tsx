"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Crown, ArrowRight } from "lucide-react";
import { useSession } from "@/core/providers/session-provider";
import { isProfileComplete } from "@/domain/profile-completeness";
import { cn } from "@/lib/utils";

function PremiumUpsellBannerContent() {
  const { profile } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // On laisse la priorité au bandeau "profil incomplet" — pas deux bandeaux à la fois.
  if (!isProfileComplete(profile) || profile.subscription_status === "ACTIVE" || pathname === "/onboarding") return null;

  const isMobileConversationOpen = pathname === "/messages" && Boolean(searchParams.get("conversation"));

  return (
    <div className={cn("px-5 pt-4 select-none", isMobileConversationOpen && "hidden md:block")}>
      <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-accent-subtle/80 border border-accent/20 px-5 py-3.5 shadow-soft">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shrink-0 shadow-accent-glow">
          <Crown size={18} />
        </div>

        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-semibold text-foreground">Passe Premium</p>
          <p className="text-xs text-muted-foreground">
            Contacte en priorité, découvre qui s&apos;intéresse à toi et débloque les filtres avancés.
          </p>
        </div>

        <Link
          href="/premium"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-95 transition-opacity rounded-full px-4 py-2 shrink-0 shadow-accent-glow"
        >
          Découvrir
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export function PremiumUpsellBanner() {
  return (
    <Suspense fallback={null}>
      <PremiumUpsellBannerContent />
    </Suspense>
  );
}
