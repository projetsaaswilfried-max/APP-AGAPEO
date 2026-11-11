"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { SessionProfile } from "@/lib/supabase/session";
import type { PreviewMode } from "@/domain/preview-mode";
import { useRightsFreshness } from "./session-freshness-watcher";

interface SessionContextValue {
  user: User;
  /** Profil tel que l'interface doit le voir — réécrit en mode aperçu (cf. requireMemberViewSession). */
  profile: SessionProfile;
  /** Vrais droits du compte, à utiliser uniquement pour ce qui ne doit pas changer en aperçu (lien Administration, commutateur). */
  realProfile: SessionProfile;
  previewMode: PreviewMode | null;
  /**
   * Faux tant que l'abonnement et la vérification affichés n'ont pas été
   * reconfirmés en base depuis l'ouverture de la page. Tout ce qui s'ouvre
   * TOUT SEUL pour reprocher au membre de ne pas être abonné (popup d'offre,
   * bandeau d'incitation) doit attendre ce drapeau : l'instantané serveur
   * peut dater d'avant un paiement qui vient d'aboutir, et proposer de payer
   * à quelqu'un qui vient de le faire est la pire chose que l'interface
   * puisse lui dire. Les refus déclenchés par une ACTION du membre, eux,
   * n'ont pas à attendre : à ce moment-là les droits servis ici sont déjà
   * ceux de la base.
   */
  rightsVerified: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  user,
  profile,
  realProfile = profile,
  previewMode = null,
  children
}: Pick<SessionContextValue, "user" | "profile"> & Partial<Pick<SessionContextValue, "realProfile" | "previewMode">> & { children: ReactNode }) {
  // Les droits surveillés sont ceux du VRAI compte : en mode aperçu, le
  // profil affiché est volontairement réécrit et diverge de la base.
  const fresh = useRightsFreshness({
    userId: user.id,
    subscriptionStatus: realProfile.subscription_status,
    photoVerificationStatus: realProfile.photo_verification_status,
    disabled: previewMode !== null
  });

  const value = useMemo<SessionContextValue>(() => {
    if (previewMode !== null) {
      return { user, profile, realProfile, previewMode, rightsVerified: true };
    }

    // `is_premium` est le miroir de `subscription_status` tenu à jour par le
    // déclencheur sync_profile_is_premium (`is_premium = status = 'ACTIVE'`) :
    // il se recalcule donc exactement, et doit suivre le même instant que lui
    // — sans quoi l'interface mélangerait deux générations de droits.
    const overlay: Partial<SessionProfile> = {};
    if (fresh.subscriptionStatus !== null) {
      overlay.subscription_status = fresh.subscriptionStatus;
      overlay.is_premium = fresh.subscriptionStatus === "ACTIVE";
    }
    if (fresh.photoVerificationStatus !== null) {
      overlay.photo_verification_status = fresh.photoVerificationStatus;
    }

    return {
      user,
      profile: { ...profile, ...overlay },
      realProfile: { ...realProfile, ...overlay },
      previewMode,
      rightsVerified: fresh.verified
    };
  }, [fresh.photoVerificationStatus, fresh.subscriptionStatus, fresh.verified, previewMode, profile, realProfile, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Doit être utilisé dans un descendant de `(dashboard)/layout.tsx` (session déjà garantie). */
export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession() doit être appelé à l'intérieur de <SessionProvider>.");
  }
  return ctx;
}
