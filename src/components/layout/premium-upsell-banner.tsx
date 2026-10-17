"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Crown, ArrowRight } from "lucide-react";
import { useSession } from "@/core/providers/session-provider";
import { isProfileComplete, needsVerificationSubmission } from "@/domain/profile-completeness";
import { PREMIUM_PLANS } from "@/domain/premium-plans";
import { cn } from "@/lib/utils";

function PremiumUpsellBannerContent() {
  const { profile } = useSession();
  const pathname = usePathname();

  // On laisse la priorité au bandeau "profil incomplet"/"à soumettre" — pas
  // deux bandeaux à la fois (cf. incomplete-profile-banner.tsx). Jamais sur la
  // page de paiement elle-même : le membre y est déjà.
  const pendingSubmission = !profile.is_staff && needsVerificationSubmission(profile);
  if (
    !isProfileComplete(profile) ||
    pendingSubmission ||
    profile.subscription_status === "ACTIVE" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/premium")
  )
    return null;

  // Sur mobile, Messagerie n'affiche jamais ce bandeau (liste ou discussion
  // ouverte) — cf. le même choix dans incomplete-profile-banner.tsx. Toujours
  // visible en version bureau.
  const hideOnMobile = pathname === "/messages";

  // Tout le bandeau mène au paiement ; l'offre mise en avant est le mensuel.
  return (
    <div className={cn("px-5 pt-4 select-none", hideOnMobile && "hidden md:block")}>
      <Link
        href="/premium"
        className="flex items-center gap-3.5 rounded-[18px] bg-accent-subtle px-4 py-3.5 transition-colors hover:bg-accent-subtle/70 active:bg-accent-subtle/60"
      >
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shrink-0">
          <Crown size={18} />
        </span>

        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-foreground">Quelqu&apos;un t&apos;attend peut-être déjà ici</span>
          <span className="block text-xs text-muted-foreground leading-snug mt-0.5">
            Des célibataires chrétiens prêts à s&apos;engager. Passe Premium pour voir leurs profils et leur écrire.
          </span>
        </span>

        <span className="hidden sm:flex flex-col items-end shrink-0 text-right">
          <span className="text-[11px] text-muted-foreground">dès</span>
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">{PREMIUM_PLANS.MONTHLY.priceFcfaLabel} / mois</span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-primary" />
      </Link>
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
