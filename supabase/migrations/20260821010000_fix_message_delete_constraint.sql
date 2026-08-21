-- ============================================================================
-- Bug pré-existant découvert en testant le correctif précédent : la
-- suppression d'un message TEXT (deleteMessage() met content=null +
-- deleted_at=now()) violait systématiquement `messages_content_or_attachment`
-- (qui exigeait content non-nul pour tout message TEXT, sans exception pour
-- une suppression). La fonctionnalité "supprimer un message" ne pouvait donc
-- jamais aboutir pour un message texte.
-- ============================================================================

alter table messages drop constraint messages_content_or_attachment;

alter table messages add constraint messages_content_or_attachment check (
  type = 'SYSTEM' or content is not null or type in ('IMAGE', 'VIDEO', 'DOCUMENT', 'VOICE') or deleted_at is not null
);
