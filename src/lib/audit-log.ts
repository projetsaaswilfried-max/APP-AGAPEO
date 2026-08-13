import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Trace une action admin — jamais bloquant : une erreur d'écriture du journal ne doit pas faire échouer l'action elle-même. */
export async function logAdminAction(
  actorId: string,
  action: string,
  options: { targetType?: string; targetId?: string; details?: Record<string, unknown> } = {}
) {
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      actor_id: actorId,
      action,
      target_type: options.targetType ?? null,
      target_id: options.targetId ?? null,
      details: options.details ?? null
    });
  } catch {
    // Le journal d'audit ne doit jamais faire capoter l'action admin réelle.
  }
}
