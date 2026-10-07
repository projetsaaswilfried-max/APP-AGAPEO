import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Suppression de compte pour l'app mobile. Le mobile n'a jamais la clé
 * service-role (voir Agapeo-Mobile-PRD.md §18) donc ne peut pas appeler
 * `admin.auth.admin.deleteUser` lui-même — il n'avait jusqu'ici aucun moyen
 * de réellement supprimer un compte, seulement de se déconnecter localement
 * (bug réel signalé : le compte restait utilisable après "suppression").
 * Miroir exact de `deleteAccountAction` (web), juste exposé en HTTP et
 * authentifié par le jeton d'accès du membre plutôt que par sa session cookie.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Valide le jeton et identifie son propriétaire réel — un appelant ne peut
  // jamais supprimer un autre compte que le sien, le jeton fait foi.
  const {
    data: { user },
    error: tokenError
  } = await admin.auth.getUser(token);
  if (tokenError || !user) {
    return NextResponse.json({ error: "Session invalide ou expirée." }, { status: 401 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
