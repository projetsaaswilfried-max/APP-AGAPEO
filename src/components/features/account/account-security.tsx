"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { UserProfile } from "@/domain/types/user";
import { createClient } from "@/lib/supabase/client";
import { submitVerificationRequestAction } from "@/lib/actions/verification.actions";
import { getBlockedProfilesAction, unblockUserAction } from "@/lib/actions/moderation.actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { ShieldCheck, ShieldQuestion, Lock, LogOut, Trash2, KeyRound, Mail, AlertCircle, CheckCircle2, Clock, Download, ArrowRight, UserX } from "lucide-react";
import { changePasswordAction, changeEmailAction, signOutAction, type FormState } from "@/lib/actions/auth.actions";
import { deleteAccountAction, exportMyDataAction } from "@/lib/actions/profile.actions";

interface AccountSecurityProps {
  profile: UserProfile;
}

const initialState: FormState = undefined;

function VerificationStatusCard({ profile }: { profile: UserProfile }) {
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    if (profile.photoVerificationStatus !== "REJECTED") return;
    const supabase = createClient();
    supabase
      .from("verification_requests")
      .select("rejection_reason")
      .eq("user_id", profile.id)
      .eq("status", "REJECTED")
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setRejectionReason(data?.rejection_reason ?? null));
  }, [profile.id, profile.photoVerificationStatus]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await submitVerificationRequestAction();
    setIsSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setJustSubmitted(true);
  };

  if (profile.photoVerificationStatus === "VERIFIED") return null;

  return (
    <Card variant="base" className="p-6 space-y-3 border-border/60 shadow-2xs">
      <div className="flex items-center gap-2">
        <ShieldQuestion className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground tracking-tight">Vérification de profil</h3>
      </div>

      {justSubmitted || profile.photoVerificationStatus === "PENDING" ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 text-accent text-xs">
          <Clock size={15} className="shrink-0" />
          Ta demande est en cours de traitement — tu recevras un email dès qu&apos;elle sera examinée.
        </div>
      ) : (
        <>
          {profile.photoVerificationStatus === "REJECTED" && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive space-y-1">
              <p className="font-semibold">Ta précédente demande n&apos;a pas été validée</p>
              {rejectionReason && <p className="text-destructive/90">{rejectionReason}</p>}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Complète ton profil (photo, confession, vision du mariage) puis soumets-le pour vérification — ton badge apparaîtra une fois validé par
            notre équipe.
          </p>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting} leftIcon={<ShieldCheck size={15} />}>
            {profile.photoVerificationStatus === "REJECTED" ? "Soumettre à nouveau" : "Soumettre pour vérification"}
          </Button>
          {error && (
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
              <Link href="/onboarding" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                Compléter mon profil <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

interface BlockedProfile {
  id: string;
  first_name: string;
  avatar_url: string | null;
}

/**
 * Le blocage est symétrique côté RLS (`profiles_select` exclut un profil
 * bloqué dans les deux sens) : impossible de revoir cette personne "depuis
 * la discussion" puisque la discussion elle-même a disparu. C'est donc ici,
 * dans un espace toujours accessible, que se fait le déblocage.
 */
function BlockedUsersCard() {
  const [blocked, setBlocked] = useState<BlockedProfile[] | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    getBlockedProfilesAction().then((result) => {
      if (result.success) setBlocked(result.profiles as BlockedProfile[]);
    });
  }, []);

  const handleUnblock = async (id: string) => {
    setUnblockingId(id);
    await unblockUserAction(id);
    setBlocked((prev) => prev?.filter((p) => p.id !== id) ?? null);
    setUnblockingId(null);
  };

  if (!blocked || blocked.length === 0) return null;

  return (
    <Card variant="base" className="p-6 space-y-4 border-border/60 shadow-2xs">
      <div className="flex items-center gap-2">
        <UserX className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground tracking-tight">Comptes bloqués</h3>
      </div>
      <div className="space-y-2">
        {blocked.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-secondary/40">
            <div className="flex items-center gap-2.5">
              <Avatar size="sm" src={p.avatar_url ?? undefined} fallback={p.first_name.charAt(0)} />
              <span className="text-xs font-medium text-foreground">{p.first_name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleUnblock(p.id)} isLoading={unblockingId === p.id}>
              Débloquer
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function AccountSecurity({ profile }: AccountSecurityProps) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [state, action, pending] = useActionState(changePasswordAction, initialState);
  const [emailState, emailAction, emailPending] = useActionState(changeEmailAction, initialState);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteAccountAction();
    if (result?.error) {
      setDeleteError(result.error);
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const result = await exportMyDataAction();
      if (result?.error || !result?.data) {
        setExportError(result?.error ?? "L'export a échoué.");
        return;
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agape-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "L'export a échoué.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 select-none">
      <VerificationStatusCard profile={profile} />
      <BlockedUsersCard />

      <Card variant="base" className="p-6 space-y-6 border-border/60 shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-base font-display font-semibold text-foreground tracking-tight">
              Sécurité du Compte & Identifiants
            </h2>
          </div>
          <Badge variant={profile.badges.some((b) => b.code === "VERIFIED_FAITH") ? "verified" : "status"} className="text-xs">
            <ShieldCheck size={13} /> {profile.badges.some((b) => b.code === "VERIFIED_FAITH") ? "Compte vérifié" : "Vérification en cours"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Adresse e-mail" value={profile.email || ""} disabled />
          <Input label="Numéro de téléphone" value={profile.phone || "Non renseigné"} disabled />
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-border/40">
          <div>
            <h4 className="text-xs font-semibold text-foreground">Adresse e-mail</h4>
            <p className="text-xs text-muted-foreground">Un email de confirmation sera envoyé à la nouvelle adresse.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEmailModalOpen(true)} leftIcon={<Mail size={15} />}>
            Changer l&apos;adresse email
          </Button>
        </div>

        <div className="pt-3 flex flex-wrap items-center justify-between gap-4 border-t border-border/40">
          <div>
            <h4 className="text-xs font-semibold text-foreground">Mot de passe</h4>
            <p className="text-xs text-muted-foreground">Modifie ton mot de passe à tout moment.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsPasswordModalOpen(true)} leftIcon={<KeyRound size={15} />}>
            Changer le mot de passe
          </Button>
        </div>
      </Card>

      <Card variant="base" className="p-6 space-y-4 border-border/60 shadow-2xs">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground tracking-tight">Mes données personnelles</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Télécharge une copie complète des données que tu as fournies ou générées sur Agape (profil, publications, favoris, messages envoyés...).
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-semibold text-foreground">Exporter mes données</h4>
            <p className="text-xs text-muted-foreground">Fichier JSON téléchargé directement, aucune donnée envoyée par email.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} isLoading={isExporting} leftIcon={<Download size={15} />}>
            Télécharger mes données
          </Button>
        </div>
        {exportError && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            <AlertCircle size={14} className="shrink-0" />
            {exportError}
          </div>
        )}
      </Card>

      <Card variant="base" className="p-6 space-y-4 border-destructive/30 bg-destructive/5 shadow-2xs">
        <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider">Zone de Gestion Avancée</h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Déconnexion de l&apos;application</h4>
            <p className="text-xs text-muted-foreground">Fermer ta session sur cet appareil.</p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm" leftIcon={<LogOut size={15} />}>
              Se déconnecter
            </Button>
          </form>
        </div>

        <div className="pt-3 border-t border-destructive/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-destructive">Supprimer définitivement mon compte</h4>
            <p className="text-xs text-muted-foreground">Cette action est irréversible et supprimera l&apos;ensemble de tes données.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setIsDeleteModalOpen(true)} leftIcon={<Trash2 size={15} />}>
            Supprimer mon compte
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Changer de mot de passe"
        description="Choisis un mot de passe robuste d'au moins 8 caractères."
      >
        {state?.message === "PASSWORD_UPDATED" ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={15} className="shrink-0" />
            Mot de passe mis à jour avec succès.
          </div>
        ) : (
          <form action={action} className="space-y-3">
            <Input
              label="Mot de passe actuel"
              name="currentPassword"
              type="password"
              placeholder="••••••••"
              error={state?.errors?.currentPassword?.[0]}
            />
            <Input label="Nouveau mot de passe" name="password" type="password" placeholder="••••••••" error={state?.errors?.password?.[0]} />
            <Input
              label="Confirmer le nouveau mot de passe"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              error={state?.errors?.confirmPassword?.[0]}
            />
            {state?.message && state.message !== "PASSWORD_UPDATED" && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                <AlertCircle size={14} className="shrink-0" />
                {state.message}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsPasswordModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={pending}>
                Mettre à jour
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Changer d'adresse email"
        description="Un email de confirmation sera envoyé à la nouvelle adresse — ton adresse actuelle ne change qu'après validation."
      >
        {emailState?.message === "EMAIL_CHANGE_REQUESTED" ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={15} className="shrink-0" />
            Vérifie ta boîte mail (nouvelle adresse) pour confirmer le changement.
          </div>
        ) : (
          <form action={emailAction} className="space-y-3">
            <Input label="Adresse email actuelle" value={profile.email || ""} disabled />
            <Input
              label="Nouvelle adresse email"
              name="newEmail"
              type="email"
              placeholder="nouvelle@adresse.com"
              error={emailState?.errors?.newEmail?.[0]}
            />
            <Input
              label="Mot de passe actuel"
              name="currentPassword"
              type="password"
              placeholder="••••••••"
              error={emailState?.errors?.currentPassword?.[0]}
            />
            {emailState?.message && emailState.message !== "EMAIL_CHANGE_REQUESTED" && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                <AlertCircle size={14} className="shrink-0" />
                {emailState.message}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEmailModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={emailPending}>
                Envoyer la confirmation
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmer la suppression du compte"
        description="Es-tu certain(e) de vouloir supprimer ton compte Agape ?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} isLoading={isDeleting}>
              Supprimer mon compte
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          Toutes tes conversations, favoris, photos et informations de foi seront définitivement effacées.
        </p>
        {deleteError && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            <AlertCircle size={14} className="shrink-0" />
            {deleteError}
          </div>
        )}
      </Modal>
    </div>
  );
}
