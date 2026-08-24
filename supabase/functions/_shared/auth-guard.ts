// verify_jwt (activé sur toutes ces fonctions) confirme seulement que
// l'appelant présente un JWT valide POUR CE PROJET — la clé publique anon,
// intégrée dans tout bundle client, est un JWT valide et passe donc ce
// contrôle. Ces fonctions ne sont censées être déclenchées que par pg_cron ou
// un trigger DB, qui envoient tous deux systématiquement la clé service_role
// historique lue depuis Vault (cf. migrations correspondantes) : on exige
// donc explicitement cette clé exacte pour fermer l'accès à quiconque ne
// détiendrait que la clé anon publique.
//
// Volontairement PAS Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") : ce projet a
// migré vers le nouveau système de clés Supabase, où cette variable réservée
// résout désormais vers la nouvelle clé "sb_secret_..." — différente de la
// clé JWT historique que Vault fournit à pg_cron/aux triggers. CRON_SERVICE_ROLE_KEY
// est un secret dédié, fixé explicitement à cette même clé JWT historique,
// pour que la comparaison corresponde à ce que les appelants légitimes envoient réellement.
export function requireServiceRole(req: Request): Response | null {
  const expected = `Bearer ${Deno.env.get("CRON_SERVICE_ROLE_KEY")}`;
  const actual = req.headers.get("Authorization");
  if (actual !== expected) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  return null;
}
