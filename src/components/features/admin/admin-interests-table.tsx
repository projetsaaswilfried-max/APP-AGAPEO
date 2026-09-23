"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { createInterestAction, updateInterestAction, deleteInterestAction } from "@/lib/actions/interests.actions";
import { Heart, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import type { InterestRow } from "@/lib/supabase/database.types";

export function AdminInterestsTable({ initialInterests }: { initialInterests: InterestRow[] }) {
  const [interests, setInterests] = useState(initialInterests);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteTarget = interests.find((i) => i.id === deleteId);

  const openCreateForm = () => {
    setEditingId(null);
    setName("");
    setError(null);
    setFormOpen(true);
  };

  const openEditForm = (interest: InterestRow) => {
    setEditingId(interest.id);
    setName(interest.name);
    setError(null);
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = editingId ? await updateInterestAction(editingId, { name }) : await createInterestAction({ name });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setFormOpen(false);
      // Le nouvel id (slug) n'est connu que côté serveur pour une création —
      // on rafraîchit toute la liste plutôt que de deviner l'id localement.
      window.location.reload();
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setInterests((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      const result = await deleteInterestAction(id);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-display font-semibold text-foreground">Centres d&apos;intérêt</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Liste proposée en case à cocher à l&apos;onboarding et sur le profil — {interests.length} entrée(s).
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateForm} leftIcon={<Plus size={14} />}>
          Ajouter
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {interests.length === 0 ? (
        <EmptyState icon={<Heart size={22} />} title="Aucun centre d'intérêt" description="Ajoutes-en un pour qu'il apparaisse dans les formulaires." />
      ) : (
        <Card variant="base" className="border-border/60 shadow-2xs divide-y divide-border/60">
          {interests.map((interest) => (
            <div key={interest.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{interest.name}</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{interest.id}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditForm(interest)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                  title="Renommer"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(interest.id)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Renommer" : "Ajouter un centre d'intérêt"}
        maxWidth="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isPending}>
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </>
        }
      >
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Nom</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Poterie"
            maxLength={40}
            className="w-full h-10 rounded-xl border border-border/60 bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Supprimer ce centre d'intérêt ?"
        description={deleteTarget ? `« ${deleteTarget.name} » ne sera plus proposé — les membres qui l'avaient déjà coché le gardent tel quel.` : undefined}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete} leftIcon={<Trash2 size={14} />}>
              Supprimer
            </Button>
          </>
        }
      >
        <></>
      </Modal>
    </div>
  );
}
