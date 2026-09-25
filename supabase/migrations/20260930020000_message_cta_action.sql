-- ============================================================================
-- Retour du dev mobile, a raison : `cta_url` (un chemin web du style
-- "/premium") est concu pour la navigation web (Next.js), pas pour l'app
-- mobile -- exactement le meme probleme deja souleve pour `target_url` sur
-- les notifications, ou le dev doit "deviner"/parser un chemin plutot que
-- de recevoir un identifiant fixe a switcher.
--
-- Ajoute `cta_action`, un identifiant STABLE (jamais un chemin, jamais
-- destine a changer si la destination web change de route) que le mobile
-- peut mapper directement vers son propre ecran natif -- meme principe que
-- `notifications.type`, deja ajoute au payload push pour la meme raison.
-- `cta_url` reste utilise par le web (Link Next.js), `cta_action` par le
-- mobile -- deux representations de la meme destination, chacune adaptee a
-- son propre systeme de navigation.
-- ============================================================================

alter table messages add column cta_action text;
