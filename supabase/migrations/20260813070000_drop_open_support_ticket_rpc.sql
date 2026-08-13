-- Le premier message d'un dossier peut désormais porter une image, ce qui
-- impose de créer le dossier AVANT d'uploader (le chemin de stockage est
-- scopé par ticket_id). La création est donc gérée en deux temps côté
-- application (insert du dossier, puis envoi du premier message) au lieu de
-- cette RPC atomique texte-only, devenue inutilisée.
drop function if exists open_support_ticket(text, text);
