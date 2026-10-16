"use server";

import { cookies } from "next/headers";
import { requireSession } from "@/lib/supabase/session";
import { PREVIEW_MODE_COOKIE, canUsePreviewMode, parsePreviewMode } from "@/domain/preview-mode";

/** Active (ou quitte, avec null) le mode aperçu abonné / non-abonné — équipe uniquement. Next re-rend la page avec le nouveau cookie. */
export async function setPreviewModeAction(mode: string | null) {
  const { profile } = await requireSession();
  if (!canUsePreviewMode(profile)) return;

  const cookieStore = await cookies();
  const parsed = parsePreviewMode(mode ?? undefined);
  if (!parsed) {
    cookieStore.delete(PREVIEW_MODE_COOKIE);
    return;
  }
  cookieStore.set(PREVIEW_MODE_COOKIE, parsed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}
