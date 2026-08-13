"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { SessionProfile } from "@/lib/supabase/session";

interface SessionContextValue {
  user: User;
  profile: SessionProfile;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  user,
  profile,
  children
}: SessionContextValue & { children: ReactNode }) {
  return <SessionContext.Provider value={{ user, profile }}>{children}</SessionContext.Provider>;
}

/** Doit être utilisé dans un descendant de `(dashboard)/layout.tsx` (session déjà garantie). */
export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession() doit être appelé à l'intérieur de <SessionProvider>.");
  }
  return ctx;
}
