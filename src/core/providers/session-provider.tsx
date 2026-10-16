"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { SessionProfile } from "@/lib/supabase/session";
import type { PreviewMode } from "@/domain/preview-mode";

interface SessionContextValue {
  user: User;
  /** Profil tel que l'interface doit le voir — réécrit en mode aperçu (cf. requireMemberViewSession). */
  profile: SessionProfile;
  /** Vrais droits du compte, à utiliser uniquement pour ce qui ne doit pas changer en aperçu (lien Administration, commutateur). */
  realProfile: SessionProfile;
  previewMode: PreviewMode | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  user,
  profile,
  realProfile = profile,
  previewMode = null,
  children
}: Pick<SessionContextValue, "user" | "profile"> & Partial<Pick<SessionContextValue, "realProfile" | "previewMode">> & { children: ReactNode }) {
  return <SessionContext.Provider value={{ user, profile, realProfile, previewMode }}>{children}</SessionContext.Provider>;
}

/** Doit être utilisé dans un descendant de `(dashboard)/layout.tsx` (session déjà garantie). */
export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession() doit être appelé à l'intérieur de <SessionProvider>.");
  }
  return ctx;
}
