-- ============================================================================
-- Un signalement PENDING atterrissait dans une file sans aucun moyen de
-- discuter avec la personne visée pour comprendre ce qui s'est passé —
-- l'admin ne pouvait que changer le statut à l'aveugle. On relie désormais
-- un signalement à un dossier support (réutilisé si la personne en a déjà un
-- ouvert, sinon créé) pour que l'équipe puisse lui demander de s'expliquer et
-- échanger avec elle avant de trancher. Rien ne change côté RLS : la
-- création/liaison se fait uniquement via le client service-role dans
-- openReportConversationAction (admin.actions.ts), jamais par un membre.
-- ============================================================================

alter table support_tickets add column report_id uuid references reports (id) on delete set null;

create index support_tickets_report_idx on support_tickets (report_id) where report_id is not null;
