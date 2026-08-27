"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RichEmailEditor } from "@/components/features/admin/rich-email-editor";
import { sendEmailCampaignAction, cancelScheduledCampaignAction } from "@/lib/actions/admin-email.actions";
import { AUDIENCE_LABELS, type EmailAudience } from "@/domain/email-audience";
import { applyMergeTags } from "@/domain/email-merge-tags";
import type { EmailCampaignStatus } from "@/lib/supabase/database.types";
import { Send, Mail, Users2, AlertCircle, CheckCircle2, Search, Eye, Clock, X } from "lucide-react";

export interface DirectRecipientOption {
  id: string;
  name: string;
  email: string;
}

interface CampaignHistoryItem {
  id: string;
  subject: string;
  audience: string;
  recipientsCount: number;
  failedCount: number;
  status: EmailCampaignStatus;
  scheduledFor: string | null;
  sentAt: string;
  senderName: string;
}

type SegmentAudience = Exclude<EmailAudience, "DIRECT">;

interface AdminEmailComposerProps {
  initialCounts: Record<SegmentAudience, number>;
  directRecipients: DirectRecipientOption[];
  history: CampaignHistoryItem[];
}

const SEGMENT_AUDIENCES: SegmentAudience[] = ["ALL", "PREMIUM", "NO_SUBSCRIPTION", "VERIFIED", "INCOMPLETE_PROFILE"];

const STATUS_LABELS: Record<EmailCampaignStatus, string> = {
  SCHEDULED: "Programmée",
  SENT: "Envoyée",
  FAILED: "Échouée",
  CANCELED: "Annulée"
};

function minDateTimeLocal(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  d.setSeconds(0, 0);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function AdminEmailComposer({ initialCounts, directRecipients, history: initialHistory }: AdminEmailComposerProps) {
  const [history, setHistory] = useState(initialHistory);
  const [mode, setMode] = useState<"SEGMENT" | "DIRECT">("SEGMENT");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [audience, setAudience] = useState<SegmentAudience>("ALL");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<DirectRecipientOption | null>(null);
  const [sendTiming, setSendTiming] = useState<"NOW" | "LATER">("NOW");
  const [scheduledFor, setScheduledFor] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [minScheduleValue, setMinScheduleValue] = useState<string | undefined>(undefined);

  // Calculé côté client uniquement — dépend du fuseau horaire du navigateur,
  // qui diffère du serveur SSR (évite un mismatch d'hydratation React).
  useEffect(() => {
    setMinScheduleValue(minDateTimeLocal());
  }, []);

  const matchingRecipients = useMemo(() => {
    const q = recipientQuery.trim().toLowerCase();
    if (!q) return [];
    return directRecipients.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)).slice(0, 8);
  }, [recipientQuery, directRecipients]);

  const recipientCount = mode === "SEGMENT" ? initialCounts[audience] : selectedRecipient ? 1 : 0;
  const audienceLabel = mode === "SEGMENT" ? AUDIENCE_LABELS[audience] : selectedRecipient ? selectedRecipient.name : "Aucun destinataire choisi";
  const previewFirstName = mode === "DIRECT" && selectedRecipient ? selectedRecipient.name.split(" ")[0] : "Marie";

  const handleSendClick = () => {
    setResult(null);
    const plainText = bodyHtml.replace(/<[^>]*>/g, "").trim();
    if (!subject.trim() || !plainText) {
      setResult({ type: "error", message: "Renseigne un objet et un message avant d'envoyer." });
      return;
    }
    if (mode === "DIRECT" && !selectedRecipient) {
      setResult({ type: "error", message: "Choisis un destinataire précis." });
      return;
    }
    if (sendTiming === "LATER" && !scheduledFor) {
      setResult({ type: "error", message: "Choisis une date et une heure d'envoi." });
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSend = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      const res = await sendEmailCampaignAction({
        subject,
        bodyHtml,
        audience: mode === "SEGMENT" ? audience : "DIRECT",
        directRecipientId: mode === "DIRECT" ? selectedRecipient?.id : undefined,
        scheduledFor: sendTiming === "LATER" ? new Date(scheduledFor).toISOString() : undefined
      });
      if (res?.error) {
        setResult({ type: "error", message: res.error });
        return;
      }
      setResult({
        type: "success",
        message: res!.scheduled
          ? `Campagne programmée pour le ${new Date(res!.scheduledFor!).toLocaleString("fr-FR")}.`
          : `Email envoyé à ${res!.sent} destinataire(s)${res!.failed ? ` (${res!.failed} échec(s))` : ""}.`
      });
      setSubject("");
      setBodyHtml("");
      setSelectedRecipient(null);
      setRecipientQuery("");
      setSendTiming("NOW");
      setScheduledFor("");
    });
  };

  const handleCancelScheduled = (campaignId: string) => {
    setHistory((prev) => prev.map((h) => (h.id === campaignId ? { ...h, status: "CANCELED" } : h)));
    startTransition(async () => {
      await cancelScheduledCampaignAction(campaignId);
    });
  };

  return (
    <div className="space-y-6">
      <Card variant="base" className="p-6 space-y-5 border-border/60 shadow-2xs">
        <div className="flex items-center gap-2">
          <Mail size={17} className="text-accent" />
          <h2 className="text-base font-display font-semibold text-foreground tracking-tight">Nouvelle campagne email</h2>
        </div>

        <div className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl border border-border/40 w-fit">
          <button
            onClick={() => setMode("SEGMENT")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${mode === "SEGMENT" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
          >
            Par catégorie
          </button>
          <button
            onClick={() => setMode("DIRECT")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${mode === "DIRECT" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
          >
            Destinataire précis
          </button>
        </div>

        {mode === "SEGMENT" ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Catégorie de destinataires</label>
            <div className="flex flex-wrap gap-2">
              {SEGMENT_AUDIENCES.map((a) => (
                <button
                  key={a}
                  onClick={() => setAudience(a)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    audience === a
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-secondary/50 text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {AUDIENCE_LABELS[a]}
                  <span className="ml-1.5 opacity-80">({initialCounts[a]})</span>
                </button>
              ))}
            </div>
            {recipientCount === 0 && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                <AlertCircle size={11} /> Ce segment est vide pour le moment — normal tant que l&apos;abonnement n&apos;est pas encore actif.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Rechercher un membre</label>
            {selectedRecipient ? (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-accent/10 border border-accent/30">
                <div className="text-xs">
                  <span className="font-semibold text-foreground">{selectedRecipient.name}</span>
                  <span className="text-muted-foreground ml-1.5">{selectedRecipient.email}</span>
                </div>
                <button onClick={() => setSelectedRecipient(null)} className="text-[11px] text-muted-foreground hover:text-destructive font-medium">
                  Changer
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    placeholder="Nom ou email..."
                    className="w-full h-9 pl-9 pr-3 text-xs bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {matchingRecipients.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                    {matchingRecipients.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedRecipient(r);
                          setRecipientQuery("");
                        }}
                        className="w-full flex flex-col items-start px-3 py-2 text-xs hover:bg-secondary text-left"
                      >
                        <span className="font-medium text-foreground">{r.name}</span>
                        <span className="text-muted-foreground">{r.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Input label="Objet" placeholder="Ex : Nouveautés sur Agapeo cette semaine" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Message</label>
            <button
              onClick={() => setShowPreview((p) => !p)}
              className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
            >
              <Eye size={12} /> {showPreview ? "Masquer l'aperçu" : "Aperçu destinataire"}
            </button>
          </div>
          <RichEmailEditor onChange={setBodyHtml} placeholder="Écris ton message... mets en forme avec la barre d'outils ci-dessus." />
        </div>

        {showPreview && (
          <div className="p-4 rounded-xl border border-border/60 bg-secondary/30 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Aperçu — tel que verra {previewFirstName}
            </p>
            <div className="p-4 rounded-lg bg-card border border-border/60">
              <p className="text-sm font-semibold text-foreground mb-2">{applyMergeTags(subject, previewFirstName) || "(sans objet)"}</p>
              <div
                className="text-sm text-foreground/90 [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-accent [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: applyMergeTags(bodyHtml, previewFirstName) || "<p class='text-muted-foreground'>(message vide)</p>" }}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Quand envoyer ?</label>
          <div className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl border border-border/40 w-fit">
            <button
              onClick={() => setSendTiming("NOW")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${sendTiming === "NOW" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              Maintenant
            </button>
            <button
              onClick={() => setSendTiming("LATER")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${sendTiming === "LATER" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              Programmer
            </button>
          </div>
          {sendTiming === "LATER" && (
            <input
              type="datetime-local"
              value={scheduledFor}
              min={minScheduleValue}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="h-9 px-3 text-xs bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </div>

        {result && (
          <div
            className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${
              result.type === "success" ? "bg-accent/10 border border-accent/30 text-primary" : "bg-destructive/10 border border-destructive/30 text-destructive"
            }`}
          >
            {result.type === "success" ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
            {result.message}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Users2 size={13} /> {recipientCount} destinataire(s) — {audienceLabel}
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendClick}
            isLoading={isPending}
            leftIcon={sendTiming === "LATER" ? <Clock size={14} /> : <Send size={14} />}
          >
            {sendTiming === "LATER" ? "Programmer" : "Envoyer"}
          </Button>
        </div>

        {confirmOpen && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <p className="text-xs text-foreground">
              {sendTiming === "LATER" ? (
                <>
                  Programmer <strong>&laquo;{subject}&raquo;</strong> pour le <strong>{scheduledFor ? new Date(scheduledFor).toLocaleString("fr-FR") : ""}</strong>{" "}
                  à <strong>{recipientCount} destinataire(s)</strong> ({audienceLabel}) ?
                </>
              ) : (
                <>
                  Confirmer l&apos;envoi de <strong>&laquo;{subject}&raquo;</strong> à <strong>{recipientCount} destinataire(s)</strong> ({audienceLabel}) ? Cette
                  action est irréversible.
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" onClick={confirmSend}>
                {sendTiming === "LATER" ? "Confirmer la programmation" : "Confirmer l'envoi"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-display font-semibold text-foreground">Historique des campagnes</h3>
        {history.length === 0 ? (
          <EmptyState icon={<Mail size={20} />} title="Aucune campagne envoyée" description="Les emails que tu enverras apparaîtront ici." />
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 p-3 bg-card border border-border/60 rounded-2xl shadow-2xs text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{h.subject}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {AUDIENCE_LABELS[h.audience as EmailAudience] ?? h.audience} · par {h.senderName} ·{" "}
                    {h.status === "SCHEDULED" && h.scheduledFor
                      ? `programmé pour le ${new Date(h.scheduledFor).toLocaleString("fr-FR")}`
                      : new Date(h.sentAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    variant="status"
                    className={`text-[10px] ${h.status === "FAILED" || h.status === "CANCELED" ? "bg-destructive/10 text-destructive border-destructive/20" : ""}`}
                  >
                    {STATUS_LABELS[h.status]}
                  </Badge>
                  {h.status === "SENT" && <Badge variant="status" className="text-[10px]">{h.recipientsCount} envoyé(s)</Badge>}
                  {h.failedCount > 0 && (
                    <Badge variant="status" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                      {h.failedCount} échec(s)
                    </Badge>
                  )}
                  {h.status === "SCHEDULED" && (
                    <button
                      onClick={() => handleCancelScheduled(h.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                      title="Annuler l'envoi programmé"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
