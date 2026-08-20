"use client";

import React, { useState } from "react";
import { UserProfile } from "@/domain/types/user";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhotoManager } from "@/components/features/profile/photo-manager";
import { Check, User, MapPin, Briefcase, GraduationCap, Camera } from "lucide-react";
import type { ProfilePhotoRow } from "@/lib/supabase/database.types";

interface AccountProfileFormProps {
  profile: UserProfile;
  initialPhotos: ProfilePhotoRow[];
  onSave: (updated: Partial<UserProfile>) => void;
}

export function AccountProfileForm({ profile, initialPhotos, onSave }: AccountProfileFormProps) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [city, setCity] = useState(profile.city);
  const [country, setCountry] = useState(profile.country);
  const [profession, setProfession] = useState(profile.profession);
  const [educationLevel, setEducationLevel] = useState(profile.educationLevel);
  const [bio, setBio] = useState(profile.bio);
  const [quote, setQuote] = useState(profile.quote || "");
  const [relocationReady, setRelocationReady] = useState(profile.marriageVision.relocationReady);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      firstName,
      lastName,
      city,
      country,
      profession,
      educationLevel,
      bio,
      quote,
      marriageVision: {
        ...profile.marriageVision,
        relocationReady
      }
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 select-none">
      <Card variant="base" className="p-6 space-y-4 border-border/60 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-border/60 pb-4">
          <Camera className="h-5 w-5 text-primary" />
          <h2 className="text-base font-display font-semibold text-foreground tracking-tight">Mes photos</h2>
        </div>
        <PhotoManager userId={profile.id} initialPhotos={initialPhotos} photoVerificationStatus={profile.photoVerificationStatus} />
      </Card>

      <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
              Informations Personnelles & Présentation
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
            label="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input
            label="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <Input
            label="Ville"
            leftIcon={<MapPin size={16} />}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <Input
            label="Pays"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
          <Input
            label="Profession"
            leftIcon={<Briefcase size={16} />}
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
          />
          <Input
            label="Niveau d'études"
            leftIcon={<GraduationCap size={16} />}
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Citation / Devise personnelle</label>
          <Input
            placeholder="Une courte phrase d'inspiration..."
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Présentation & Biographie</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={600}
          />
        </div>

        <div className="pt-2 border-t border-border/40">
          <Switch
            checked={relocationReady}
            onCheckedChange={setRelocationReady}
            label="Disponible à déménager pour le mariage"
            description="Indiquez aux autres membres si vous êtes prêt(e) à changer de région ou de pays."
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="md">
            Enregistrer le profil
          </Button>
        </div>
      </Card>
    </form>
  );
}
