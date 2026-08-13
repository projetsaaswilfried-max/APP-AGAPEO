"use client";

import React, { useState } from "react";
import { UserPrivacySettings, UserNotificationSettings } from "@/domain/types/user";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Bell, Check } from "lucide-react";

interface AccountPrivacySettingsProps {
  privacy?: UserPrivacySettings;
  notifications?: UserNotificationSettings;
  onSave: (privacy: UserPrivacySettings, notifications: UserNotificationSettings) => void;
}

export function AccountPrivacySettings({
  privacy,
  notifications,
  onSave
}: AccountPrivacySettingsProps) {
  const [showOnlineStatus, setShowOnlineStatus] = useState(privacy?.showOnlineStatus ?? true);
  const [showReadReceipts, setShowReadReceipts] = useState(privacy?.showReadReceipts ?? true);
  const [allowProfileVisits, setAllowProfileVisits] = useState(privacy?.allowProfileVisits ?? true);
  const [isInvisibleProfile, setIsInvisibleProfile] = useState(privacy?.isInvisibleProfile ?? false);
  const [isPhotoBlurred, setIsPhotoBlurred] = useState(privacy?.isPhotoBlurred ?? false);

  const [notifyMessages, setNotifyMessages] = useState(notifications?.notifyMessages ?? true);
  const [notifyFavorites, setNotifyFavorites] = useState(notifications?.notifyFavorites ?? true);
  const [notifyRecommendations, setNotifyRecommendations] = useState(notifications?.notifyRecommendations ?? true);
  const [notifyOfficialPosts, setNotifyOfficialPosts] = useState(notifications?.notifyOfficialPosts ?? true);
  const [notifyComments, setNotifyComments] = useState(notifications?.notifyComments ?? true);
  const [notifyEmailDigest, setNotifyEmailDigest] = useState(notifications?.notifyEmailDigest ?? true);

  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        showOnlineStatus,
        showReadReceipts,
        allowProfileVisits,
        isInvisibleProfile,
        isPhotoBlurred,
        allowEmailNotifications: notifyEmailDigest
      },
      {
        notifyMessages,
        notifyFavorites,
        notifyRecommendations,
        notifyOfficialPosts,
        notifyComments,
        notifyLikes: notifyComments,
        notifyEmailDigest
      }
    );

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 select-none">
      {/* Confidentialité & Floutage Éthique */}
      <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
              Paramètres de Confidentialité & Floutage Éthique
            </h2>
          </div>
          {isSaved && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <Check size={14} /> Réglages enregistrés
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* OPTION ÉTIQUE DEMANDÉE PAR L'UTILISATEUR */}
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60 space-y-2">
            <Switch
              checked={isPhotoBlurred}
              onCheckedChange={setIsPhotoBlurred}
              label="Flouter mes photos pour le grand public"
              description="Vos photos de profil seront floutées dans l'espace Découvrir et ne seront débloquées que sur votre accord exprès."
            />
          </div>

          <Switch
            checked={showOnlineStatus}
            onCheckedChange={setShowOnlineStatus}
            label="Afficher mon statut « En ligne »"
            description="Permet aux membres avec qui vous échangez de savoir si vous êtes actif."
          />
          <Switch
            checked={showReadReceipts}
            onCheckedChange={setShowReadReceipts}
            label="Afficher les confirmations de lecture (✓✓)"
            description="Indiquez aux autres membres lorsque vous avez lu leurs messages."
          />
          <Switch
            checked={allowProfileVisits}
            onCheckedChange={setAllowProfileVisits}
            label="Autoriser les notifications de visites de profil"
            description="Recevoir une notification discrète lorsqu'un membre consulte votre fiche."
          />
          <Switch
            checked={isInvisibleProfile}
            onCheckedChange={setIsInvisibleProfile}
            label="Rendre mon profil temporairement invisible"
            description="Masque votre profil de la recherche Découvrir sans supprimer vos discussions."
          />
        </div>
      </Card>

      {/* Préférences de Notifications */}
      <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-border/60 pb-4">
          <Bell className="h-5 w-5 text-accent" />
          <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
            Préférences de Notifications
          </h2>
        </div>

        <div className="space-y-4">
          <Switch
            checked={notifyMessages}
            onCheckedChange={setNotifyMessages}
            label="Notifications de nouveaux messages"
            description="Recevez une alerte lors de la réception d'un nouveau message."
          />
          <Switch
            checked={notifyFavorites}
            onCheckedChange={setNotifyFavorites}
            label="Notifications d'ajout aux favoris"
            description="Soyez averti lorsqu'un membre vous ajoute à ses favoris."
          />
          <Switch
            checked={notifyRecommendations}
            onCheckedChange={setNotifyRecommendations}
            label="Alertes de compatibilité élevée"
            description="Recevez nos propositions hebdomadaires de profils hautement compatibles."
          />
          <Switch
            checked={notifyOfficialPosts}
            onCheckedChange={setNotifyOfficialPosts}
            label="Nouveautés de la rédaction officielle"
            description="Abonnez-vous aux publications d'enseignements et témoignages."
          />
          <Switch
            checked={notifyComments}
            onCheckedChange={setNotifyComments}
            label="Likes et commentaires sur mes publications"
            description="Soyez averti quand quelqu'un aime ou commente une de vos publications personnelles."
          />
          <Switch
            checked={notifyEmailDigest}
            onCheckedChange={setNotifyEmailDigest}
            label="Résumé hebdomadaire par e-mail"
            description="Recevez un bilan synthétique de votre activité par e-mail."
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="md">
            Enregistrer les préférences
          </Button>
        </div>
      </Card>
    </form>
  );
}
