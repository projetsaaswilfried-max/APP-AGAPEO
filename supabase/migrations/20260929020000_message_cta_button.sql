-- ============================================================================
-- Les relances Premium in-app (Séquence 2, tous les 2 jours sur 30 jours)
-- n'avaient qu'un texte brut, sans aucun moyen d'agir directement depuis le
-- message — contrairement à l'email, qui a déjà un bouton. Ajoute un bouton
-- d'action optionnel sur n'importe quel message (jamais utilisé par les
-- membres entre eux, réservé aux messages système "Équipe Agapeo").
-- ============================================================================

alter table messages add column cta_text text;
alter table messages add column cta_url text;
