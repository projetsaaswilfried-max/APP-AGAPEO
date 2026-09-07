-- ============================================================================
-- Trouvé en audit sécurité : reports_update_moderation n'a pas de `with
-- check`, donc Postgres réutilise le `using` (is_admin_or_moderator) comme
-- garde-fou d'écriture — n'importe quel MODERATOR pouvait, via un appel
-- direct au SDK (hors updateReportStatusAction, qui ne touche que `status`),
-- modifier N'IMPORTE QUELLE colonne d'un signalement (reporter_id, target_id,
-- target_type, reason, details), contrairement aux autres tables sensibles
-- (support_tickets, support_messages, profile_photos) qui ont chacune un
-- trigger de garde dédié. Même principe ici : seule `status` est modifiable.
-- ============================================================================
create function guard_report_update()
returns trigger
language plpgsql
as $$
begin
  if new.reporter_id <> old.reporter_id
    or new.target_type <> old.target_type
    or new.target_id <> old.target_id
    or new.reason <> old.reason
    or new.details is distinct from old.details
    or new.created_at <> old.created_at
  then
    raise exception 'Seul le statut d''un signalement peut être modifié';
  end if;
  return new;
end;
$$;

create trigger reports_guard_update
  before update on reports
  for each row execute function guard_report_update();
