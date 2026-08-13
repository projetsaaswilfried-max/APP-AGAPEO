"use client";

import React, { useState } from "react";
import { UserFaithProfile } from "@/domain/types/user";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Church, Check } from "lucide-react";

interface AccountFaithFormProps {
  faith: UserFaithProfile;
  onSave: (updated: UserFaithProfile) => void;
}

export function AccountFaithForm({ faith, onSave }: AccountFaithFormProps) {
  const [churchDenomination, setChurchDenomination] = useState(faith.churchDenomination);
  const [faithJourneyYears, setFaithJourneyYears] = useState(faith.faithJourneyYears);
  const [baptized, setBaptized] = useState(faith.baptized);
  const [faithDescription, setFaithDescription] = useState(faith.faithDescription);
  const [favoriteVerse, setFavoriteVerse] = useState(faith.favoriteVerse || "");
  const [testimony, setTestimony] = useState(faith.testimony || "");
  const [currentGodAction, setCurrentGodAction] = useState(faith.currentGodAction || "");
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      churchDenomination,
      faithJourneyYears,
      baptized,
      faithDescription,
      communityEngagement: faith.communityEngagement,
      favoriteVerse,
      testimony,
      currentGodAction
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 select-none">
      <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <Church className="h-5 w-5 text-primary" />
            <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
              Gestion de mon Identité & Parcours de Foi
            </h2>
          </div>
          {isSaved && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <Check size={14} /> Modifications enregistrées
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Dénomination d'église"
            value={churchDenomination}
            onChange={(e) => setChurchDenomination(e.target.value)}
          />
          <Input
            label="Nombre d'années de conversion"
            type="number"
            value={faithJourneyYears}
            onChange={(e) => setFaithJourneyYears(Number(e.target.value))}
          />
        </div>

        <Switch
          checked={baptized}
          onCheckedChange={setBaptized}
          label="Baptisé(e) par immersion"
          description="Affichez votre engagement baptismal d'obéissance à la foi."
        />

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Ministère & Service local</label>
          <Input
            value={faithDescription}
            onChange={(e) => setFaithDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Verset préféré</label>
          <Textarea
            value={favoriteVerse}
            onChange={(e) => setFavoriteVerse(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Témoignage personnel</label>
          <Textarea
            value={testimony}
            onChange={(e) => setTestimony(e.target.value)}
            maxLength={600}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Ce que Dieu fait actuellement dans votre vie</label>
          <Input
            value={currentGodAction}
            onChange={(e) => setCurrentGodAction(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="md">
            Enregistrer la section Foi
          </Button>
        </div>
      </Card>
    </form>
  );
}
