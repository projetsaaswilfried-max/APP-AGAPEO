"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateUserRoleAction, toggleSuspendUserAction, toggleUserPremiumAction } from "@/lib/actions/admin.actions";
import type { AppRole, VerificationStatus } from "@/lib/supabase/database.types";
import { ExternalLink, ShieldOff, ShieldCheck, Download, Crown } from "lucide-react";

export interface AdminUserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AppRole;
  isTestAccount: boolean;
  isSuspended: boolean;
  isPremium: boolean;
  photoVerificationStatus: VerificationStatus;
  country: string;
  createdAt: string;
  lastActiveAt: string;
}

const ROLE_LABELS: Record<AppRole, string> = {
  USER: "Membre",
  MODERATOR: "Modérateur",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin"
};

const ASSIGNABLE_ROLES: AppRole[] = ["USER", "MODERATOR", "ADMIN"];

type StatusFilter = "ALL" | "ACTIVE" | "SUSPENDED";

function toCsv(rows: AdminUserRow[]): string {
  const header = ["Prénom", "Nom", "Email", "Rôle", "Statut", "Premium", "Pays", "Vérification photo", "Inscrit le"];
  const lines = rows.map((u) =>
    [
      u.firstName,
      u.lastName,
      u.email,
      u.role,
      u.isSuspended ? "Suspendu" : "Actif",
      u.isPremium ? "Oui" : "Non",
      u.country,
      u.photoVerificationStatus,
      new Date(u.createdAt).toISOString().slice(0, 10)
    ]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function AdminUsersTable({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !`${u.firstName} ${u.lastName} ${u.email} ${u.country}`.toLowerCase().includes(q)) return false;
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter === "ACTIVE" && u.isSuspended) return false;
      if (statusFilter === "SUSPENDED" && !u.isSuspended) return false;
      if (dateFrom && u.createdAt < dateFrom) return false;
      if (dateTo && u.createdAt.slice(0, 10) > dateTo) return false;
      return true;
    });
  }, [users, query, roleFilter, statusFilter, dateFrom, dateTo]);

  const handleExportCsv = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agape-utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRoleChange = (userId: string, role: AppRole) => {
    setError(null);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    startTransition(async () => {
      const result = await updateUserRoleAction(userId, role as "USER" | "MODERATOR" | "ADMIN");
      if (result?.error) setError(result.error);
    });
  };

  const handleToggleSuspend = (userId: string, suspend: boolean) => {
    setError(null);
    if (suspend) {
      const reason = window.prompt("Motif de la suspension (optionnel) :") ?? undefined;
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isSuspended: true } : u)));
      startTransition(async () => {
        const result = await toggleSuspendUserAction(userId, true, reason);
        if (result?.error) setError(result.error);
      });
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isSuspended: false } : u)));
    startTransition(async () => {
      const result = await toggleSuspendUserAction(userId, false);
      if (result?.error) setError(result.error);
    });
  };

  const handleTogglePremium = (userId: string, grant: boolean) => {
    setError(null);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isPremium: grant } : u)));
    startTransition(async () => {
      const result = await toggleUserPremiumAction(userId, grant);
      if (result?.error) {
        setError(result.error);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isPremium: !grant } : u)));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder="Rechercher par nom, email, pays..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          className="max-w-sm text-xs h-9 bg-card"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as AppRole | "ALL")}
          className="text-xs h-9 bg-card border border-border/60 rounded-xl px-2.5"
        >
          <option value="ALL">Tous les rôles</option>
          {(["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as AppRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="text-xs h-9 bg-card border border-border/60 rounded-xl px-2.5"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="ACTIVE">Actifs</option>
          <option value="SUSPENDED">Suspendus</option>
        </select>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Inscrits entre</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs h-9 bg-card border border-border/60 rounded-xl px-2.5 text-foreground"
          />
          <label className="text-xs text-muted-foreground">et</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs h-9 bg-card border border-border/60 rounded-xl px-2.5 text-foreground"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} membre(s)</span>
        <Button variant="outline" size="sm" onClick={handleExportCsv} leftIcon={<Download size={13} />} className="ml-auto">
          Exporter en CSV
        </Button>
      </div>

      {error && <p className="text-xs text-destructive px-1">{error}</p>}

      <div className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground text-left">
                <th className="px-4 py-2.5 font-medium">Membre</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Rôle</th>
                <th className="px-4 py-2.5 font-medium">Statut</th>
                <th className="px-4 py-2.5 font-medium">Premium</th>
                <th className="px-4 py-2.5 font-medium">Inscrit le</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">
                        {u.firstName} {u.lastName}
                      </span>
                      {u.isTestAccount && (
                        <Badge variant="status" className="text-[9px] px-1.5 py-0">
                          Test
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{u.country}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={u.role}
                      disabled={u.role === "SUPER_ADMIN" || isPending}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as AppRole)}
                      className="text-xs bg-secondary/60 border border-border/60 rounded-lg px-2 py-1 disabled:opacity-60"
                    >
                      {u.role === "SUPER_ADMIN" && <option value="SUPER_ADMIN">Super Admin</option>}
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    {u.isSuspended ? (
                      <Badge variant="status" className="text-[10px] px-2 py-0.5 bg-destructive/10 text-destructive border-destructive/20">
                        Suspendu
                      </Badge>
                    ) : (
                      <Badge variant="status" className="text-[10px] px-2 py-0.5">
                        Actif
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.isPremium ? (
                      <Badge variant="premium" className="text-[10px] px-2 py-0.5">
                        <Crown size={10} className="mr-1" /> Premium
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Gratuit</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/profile/${u.id}`} target="_blank" className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary" title="Voir le profil">
                        <ExternalLink size={14} />
                      </Link>
                      {u.role !== "SUPER_ADMIN" && (
                        <button
                          onClick={() => handleTogglePremium(u.id, !u.isPremium)}
                          disabled={isPending}
                          className={`p-1.5 rounded-lg disabled:opacity-60 ${
                            u.isPremium
                              ? "text-primary hover:text-destructive hover:bg-destructive/10"
                              : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                          }`}
                          title={u.isPremium ? "Retirer l'accès Premium" : "Accorder l'accès Premium"}
                        >
                          <Crown size={14} className={u.isPremium ? "fill-current" : ""} />
                        </button>
                      )}
                      {u.role !== "SUPER_ADMIN" && (
                        <button
                          onClick={() => handleToggleSuspend(u.id, !u.isSuspended)}
                          disabled={isPending}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 disabled:opacity-60"
                          title={u.isSuspended ? "Réactiver le compte" : "Suspendre le compte"}
                        >
                          {u.isSuspended ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun membre ne correspond à cette recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
