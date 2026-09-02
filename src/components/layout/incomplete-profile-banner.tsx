"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { UserCheck, ShieldCheck, ArrowRight } from "lucide-react";
import { useSession } from "@/core/providers/session-provider";
import { isProfileComplete, getMissingProfileFields, needsVerificationSubmission } from "@/domain/profile-completeness";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 4;

function IncompleteProfileBannerContent() {
  const { profile } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const missingFields = !isProfileComplete(profile);
  // Profil complet (infos + photo) mais jamais soumis pour validation — quitté
  // en cours de route (ex: "Terminer sans soumettre") : reste invisible dans
  // Découvrir tant que ce n'est pas fait, donc encore prioritaire sur le
  // bandeau "Passe Premium" (cf. premium-upsell-banner.tsx). L'équipe n'a
  // plus besoin de se faire vérifier (cf. onboarding-wizard.tsx).
  const pendingSubmission = !missingFields && !profile.is_staff && needsVerificationSubmission(profile);

  if ((!missingFields && !pendingSubmission) || pathname === "/onboarding") return null;

  // Sur mobile, une discussion ouverte occupe tout l'écran : on laisse
  // uniquement la conversation visible, sans bandeau au-dessus. Le bandeau
  // reste toujours visible en version bureau (vue partagée liste + discussion).
  const isMobileConversationOpen = pathname === "/messages" && Boolean(searchParams.get("conversation"));

  if (pendingSubmission) {
    return (
      <div className={cn("px-5 pt-4 select-none", isMobileConversationOpen && "hidden md:block")}>
        <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-accent-subtle/80 border border-accent/20 px-5 py-3.5 shadow-soft">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shrink-0 shadow-accent-glow">
            <ShieldCheck size={18} />
          </div>

          <div className="flex-1 min-w-0 sm:min-w-[220px]">
            <p className="text-sm font-semibold text-foreground">Ton profil est complet — soumets-le pour validation</p>
            <p className="text-xs text-muted-foreground">
              Valide ton profil pour apparaître dans Découvrir et être contacté par les autres membres.
            </p>
          </div>

          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-95 transition-opacity rounded-full px-4 py-2 shrink-0 shadow-accent-glow"
          >
            Soumettre
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  const missing = getMissingProfileFields(profile);
  const done = TOTAL_STEPS - missing.length;

  return (
    <div className={cn("px-5 pt-4 select-none", isMobileConversationOpen && "hidden md:block")}>
      <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-accent-subtle/80 border border-accent/20 px-5 py-3.5 shadow-soft">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shrink-0 shadow-accent-glow">
          <UserCheck size={18} />
        </div>

        <div className="flex-1 min-w-0 sm:min-w-[220px]">
          <p className="text-sm font-semibold text-foreground">
            Profil incomplet — invisible dans Découvrir
          </p>
          <p className="text-xs text-muted-foreground">
            Encore {missing.length} {missing.length > 1 ? "étapes" : "étape"} : {missing.join(", ")}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span key={i} className={`h-2 w-6 rounded-full transition-all ${i < done ? "bg-dark-control" : "bg-secondary"}`} />
            ))}
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-95 transition-opacity rounded-full px-4 py-2 shrink-0 shadow-accent-glow"
          >
            Compléter
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function IncompleteProfileBanner() {
  return (
    <Suspense fallback={null}>
      <IncompleteProfileBannerContent />
    </Suspense>
  );
}
