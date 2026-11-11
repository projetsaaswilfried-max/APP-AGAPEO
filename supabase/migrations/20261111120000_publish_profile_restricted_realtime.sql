-- « J'ai payé dans l'application et je n'ai toujours pas accès. »
--
-- L'app mobile parle directement à Supabase (cf. §18 du PRD mobile) et le PRD
-- de la passerelle de paiement lui prescrit noir sur blanc d'observer
-- `subscription_status` « en temps réel ou par sondage au retour au premier
-- plan » pour voir l'activation arriver — c'est ainsi, et seulement ainsi,
-- qu'elle apprend qu'un paiement réglé dans le navigateur externe a abouti.
--
-- Or `profile_restricted`, la table qui PORTE ce champ, n'était pas publiée
-- pour le temps réel : seules conversation_participants, messages, posts et
-- support_messages l'étaient. Une souscription Postgres Changes sur cette
-- table s'établit donc normalement... et ne reçoit jamais rien, silencieusement
-- et pour toujours. Aucune erreur, aucun signal : juste un membre qui a payé
-- et dont l'application continue de croire qu'il est en version gratuite
-- jusqu'à ce qu'il se déconnecte et se reconnecte.
--
-- Cette publication ne contourne aucune sécurité : Realtime applique la RLS de
-- la table pour chaque abonné, et `profile_restricted` n'a qu'UNE SEULE
-- politique de lecture, `profile_restricted_select_own` (id = auth.uid()).
-- Chaque membre ne peut donc recevoir que les changements de SA propre ligne,
-- jamais l'abonnement de quelqu'un d'autre.
--
-- Volume négligeable : cette ligne ne bouge qu'aux activations, expirations et
-- étapes de relance — à l'inverse de `profiles`, que l'on se garde bien de
-- publier puisque `last_active_at` y change à chaque passage de chaque membre.
--
-- L'identité de réplication par défaut (clé primaire) suffit : `id` fait
-- partie de l'enregistrement transmis, donc le filtre `id=eq.<uuid>` comme la
-- vérification RLS côté Realtime fonctionnent sans REPLICA IDENTITY FULL.
--
-- Côté web, le même canal sert à `useRightsFreshness` : l'interface cesse de
-- proposer « Passe Premium » dans la seconde qui suit l'activation, au lieu
-- d'attendre le prochain sondage.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profile_restricted'
  ) then
    alter publication supabase_realtime add table public.profile_restricted;
  end if;
end
$$;
