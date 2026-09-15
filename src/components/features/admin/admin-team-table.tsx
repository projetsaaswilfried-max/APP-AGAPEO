"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { updateUserRoleAction } from "@/lib/actions/admin.actions";
import { ROLE_LABELS, ASSIGNABLE_ROLES, VERIFICATION_LABELS, VerificationBadge } from "@/components/features/admin/admin-users-table";
import type { AppRole, VerificationStatus } from "@/lib/supabase/database.types";
import { ExternalLink, Users2 } from "lucide-react";

export interface AdminTeamMemberRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  role: AppRole;
  photoVerificationStatus: VerificationStatus;
  joinedAt: string;
}

const ROLE_ROSTER: AppRole[] = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

export function AdminTeamTable({
  initialMembers,
  viewerRole,
  viewerId
}: {
  initialMembers: AdminTeamMemberRow[];
  viewerRole: AppRole;
  viewerId: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canEditRoles = viewerRole === "SUPER_ADMIN";

  const handleRoleChange = (memberId: string, role: AppRole) => {
    setError(null);
    const previous = members;
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    startTransition(async () => {
      const result = await updateUserRoleAction(memberId, role as "USER" | "MODERATOR" | "ADMIN");
      if (result?.error) {
        setError(result.error);
        setMembers(previous);
        return;
      }
      // Un retour à USER retire ce membre de l'équipe — le roster ne montre
      // que role != 'USER' (cf. la page serveur), donc on le retire ici sans
      // attendre un rechargement complet.
      if (role === "USER") setMembers((prev) => prev.filter((m) => m.id !== memberId));
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-display font-semibold text-foreground tracking-tight">
          {members.length} membre{members.length > 1 ? "s" : ""} de l&apos;équipe
        </h2>
      </div>

      {error && <p className="text-xs text-destructive px-1">{error}</p>}

      {members.length === 0 ? (
        <EmptyState icon={<Users2 size={20} />} title="Aucun membre d'équipe" description="Attribue un rôle depuis l'onglet Utilisateurs pour faire apparaître quelqu'un ici." />
      ) : (
        <div className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-left">
                  <th className="px-4 py-2.5 font-medium">Membre</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Rôle</th>
                  <th className="px-4 py-2.5 font-medium">Profil validé</th>
                  <th className="px-4 py-2.5 font-medium">Dans l&apos;équipe depuis</th>
                  <th className="px-4 py-2.5 font-medium text-right">Profil</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_ROSTER.flatMap((role) => members.filter((m) => m.role === role)).map((m) => {
                  const locked = m.role === "SUPER_ADMIN" || m.id === viewerId || !canEditRoles;
                  return (
                    <tr key={m.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar size="sm" src={m.avatarUrl ?? undefined} fallback={m.firstName.charAt(0)} />
                          <span className="font-medium text-foreground">
                            {m.firstName} {m.lastName}
                            {m.id === viewerId && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(toi)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{m.email}</td>
                      <td className="px-4 py-2.5">
                        {locked ? (
                          <Badge variant="status" className="text-[10px] px-2 py-0.5">
                            {ROLE_LABELS[m.role]}
                          </Badge>
                        ) : (
                          <Select
                            value={m.role}
                            disabled={isPending}
                            onChange={(e) => handleRoleChange(m.id, e.target.value as AppRole)}
                            className="h-auto bg-secondary/60 rounded-lg py-1"
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </Select>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <VerificationBadge status={m.photoVerificationStatus} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(m.joinedAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/profile/${m.id}`}
                          target="_blank"
                          className="inline-flex p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"
                          title="Voir le profil"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!canEditRoles && (
        <p className="text-[11px] text-muted-foreground px-1">Seul un Super Admin peut modifier les rôles de l&apos;équipe.</p>
      )}
      <p className="text-[11px] text-muted-foreground px-1">
        {VERIFICATION_LABELS.VERIFIED} = profil de rencontre vérifié comme n&apos;importe quel membre — sans lien avec les droits d&apos;administration ci-dessus.
      </p>
    </div>
  );
}
