"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollableRow } from "@/components/ui/scrollable-row";
import { UserCheck, MessageSquare, FileText, Heart, Receipt, Venus, Mars, CameraOff } from "lucide-react";

interface TimestampRow {
  created_at: string;
}

interface NewUserRow extends TimestampRow {
  gender: "MALE" | "FEMALE";
}

interface OnboardingEventRow extends TimestampRow {
  user_id: string;
  event_type: "STEP_VIEWED" | "SELFIE_CAMERA_DENIED" | "SELFIE_CAPTURED" | "VERIFICATION_SUBMITTED";
  step_key: string | null;
}

export interface AdminOverviewActivityProps {
  newUsers: NewUserRow[];
  messages: TimestampRow[];
  conversations: TimestampRow[];
  personalPosts: TimestampRow[];
  officialPosts: TimestampRow[];
  favorites: TimestampRow[];
  transactions: TimestampRow[];
  onboardingEvents: OnboardingEventRow[];
}

// Ordre du tunnel de conversion "premier profil soumis" — reflète l'ordre
// réel des étapes de l'assistant d'onboarding (cf. OnboardingWizard).
const FUNNEL_STEPS: { key: string; label: string }[] = [
  { key: "photos", label: "Photos" },
  { key: "selfie", label: "Selfie" },
  { key: "faith", label: "Ma foi" },
  { key: "preferences", label: "Préférences" }
];

const RANGE_PRESETS = [
  { id: "7d", label: "7 derniers jours", days: 7 },
  { id: "30d", label: "30 derniers jours", days: 30 },
  { id: "90d", label: "90 derniers jours", days: 90 },
  { id: "all", label: "Depuis le début", days: null as number | null }
];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function filterInRange<T extends TimestampRow>(rows: T[], from: string, to: string): T[] {
  return rows.filter((r) => {
    const day = r.created_at.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
}

function countInRange(rows: TimestampRow[], from: string, to: string) {
  return filterInRange(rows, from, to).length;
}

export function AdminOverviewActivity(props: AdminOverviewActivityProps) {
  const [rangeId, setRangeId] = useState("30d");
  const [dateFrom, setDateFrom] = useState(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return toDateInputValue(cutoff);
  });
  const [dateTo, setDateTo] = useState("");

  const handlePreset = (id: string) => {
    setRangeId(id);
    const preset = RANGE_PRESETS.find((r) => r.id === id);
    if (!preset?.days) {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - preset.days);
    setDateFrom(toDateInputValue(cutoff));
    setDateTo("");
  };

  const handleCustomDateChange = (field: "from" | "to", value: string) => {
    setRangeId("custom");
    if (field === "from") setDateFrom(value);
    else setDateTo(value);
  };

  const handleReset = () => {
    setRangeId("30d");
    handlePreset("30d");
  };

  const newUsersInRange = useMemo(() => filterInRange(props.newUsers, dateFrom, dateTo), [props.newUsers, dateFrom, dateTo]);

  const counts = useMemo(
    () => ({
      newUsers: newUsersInRange.length,
      femmes: newUsersInRange.filter((u) => u.gender === "FEMALE").length,
      hommes: newUsersInRange.filter((u) => u.gender === "MALE").length,
      messages: countInRange(props.messages, dateFrom, dateTo),
      conversations: countInRange(props.conversations, dateFrom, dateTo),
      personalPosts: countInRange(props.personalPosts, dateFrom, dateTo),
      officialPosts: countInRange(props.officialPosts, dateFrom, dateTo),
      favorites: countInRange(props.favorites, dateFrom, dateTo),
      transactions: countInRange(props.transactions, dateFrom, dateTo)
    }),
    [props, dateFrom, dateTo, newUsersInRange]
  );

  const genderTotal = counts.femmes + counts.hommes;
  const femmesPct = genderTotal > 0 ? Math.round((counts.femmes / genderTotal) * 100) : 0;
  const hommesPct = genderTotal > 0 ? 100 - femmesPct : 0;

  // Un même membre peut visiter une étape plusieurs fois (retour en arrière,
  // rafraîchissement) — on compte des membres DISTINCTS atteignant chaque
  // étape, jamais des évènements bruts, sinon le tunnel serait faussé.
  const funnel = useMemo(() => {
    const eventsInRange = filterInRange(props.onboardingEvents, dateFrom, dateTo);
    const distinctUsersFor = (predicate: (e: OnboardingEventRow) => boolean) =>
      new Set(eventsInRange.filter(predicate).map((e) => e.user_id)).size;

    const steps = FUNNEL_STEPS.map((step) => ({
      ...step,
      count: distinctUsersFor((e) => e.event_type === "STEP_VIEWED" && e.step_key === step.key)
    }));
    const submittedCount = distinctUsersFor((e) => e.event_type === "VERIFICATION_SUBMITTED");
    const cameraDeniedCount = distinctUsersFor((e) => e.event_type === "SELFIE_CAMERA_DENIED");

    return { steps: [...steps, { key: "submitted", label: "Soumis pour vérification", count: submittedCount }], cameraDeniedCount };
  }, [props.onboardingEvents, dateFrom, dateTo]);

  const funnelMax = Math.max(...funnel.steps.map((s) => s.count), 1);

  const stats = [
    { label: "Nouveaux membres", value: counts.newUsers, icon: UserCheck },
    { label: "Messages envoyés", value: counts.messages, icon: MessageSquare },
    { label: "Conversations créées", value: counts.conversations, icon: MessageSquare },
    { label: "Publications personnelles", value: counts.personalPosts, icon: FileText },
    { label: "Publications officielles", value: counts.officialPosts, icon: FileText },
    { label: "Favoris ajoutés", value: counts.favorites, icon: Heart },
    { label: "Transactions enregistrées", value: counts.transactions, icon: Receipt }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ScrollableRow className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl border border-border/40 w-full sm:w-fit">
          {RANGE_PRESETS.map((r) => (
            <button
              key={r.id}
              onClick={() => handlePreset(r.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                rangeId === r.id ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </ScrollableRow>

        <div className="flex flex-wrap items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Du</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleCustomDateChange("from", e.target.value)}
            className="text-xs h-9 bg-card border border-border/60 rounded-xl px-2.5 text-foreground"
          />
          <label className="text-xs text-muted-foreground">au</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleCustomDateChange("to", e.target.value)}
            className="text-xs h-9 bg-card border border-border/60 rounded-xl px-2.5 text-foreground"
          />
          {(dateFrom || dateTo) && (
            <button type="button" onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} variant="base" className="p-4 border-border/60 shadow-2xs space-y-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent/10 text-accent">
              <stat.icon size={17} />
            </div>
            <p className="text-2xl font-display font-semibold text-foreground tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted-foreground leading-snug">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card variant="base" className="p-4 border-border/60 shadow-2xs space-y-4">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Répartition par genre — nouveaux membres</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-chart-female/10 text-chart-female shrink-0">
              <Venus size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-display font-semibold text-foreground tracking-tight">{counts.femmes}</p>
              <p className="text-xs text-muted-foreground">Femmes{genderTotal > 0 && ` · ${femmesPct}%`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-chart-male/10 text-chart-male shrink-0">
              <Mars size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-display font-semibold text-foreground tracking-tight">{counts.hommes}</p>
              <p className="text-xs text-muted-foreground">Hommes{genderTotal > 0 && ` · ${hommesPct}%`}</p>
            </div>
          </div>
        </div>

        {genderTotal > 0 ? (
          <div className="flex h-3 w-full gap-[2px]" role="img" aria-label={`Répartition : ${femmesPct}% de femmes, ${hommesPct}% d'hommes`}>
            {femmesPct > 0 && (
              <div
                className={`h-full bg-chart-female ${hommesPct === 0 ? "rounded-full" : "rounded-l-full"}`}
                style={{ width: `${femmesPct}%` }}
              />
            )}
            {hommesPct > 0 && (
              <div
                className={`h-full bg-chart-male ${femmesPct === 0 ? "rounded-full" : "rounded-r-full"}`}
                style={{ width: `${hommesPct}%` }}
              />
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucun nouveau membre sur cette période.</p>
        )}
      </Card>

      <Card variant="base" className="p-4 border-border/60 shadow-2xs space-y-4">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Entonnoir d&apos;onboarding — premier profil soumis</p>

        {funnelMax > 1 ? (
          <div className="space-y-2.5">
            {funnel.steps.map((step) => {
              const pct = Math.round((step.count / funnelMax) * 100);
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-32 shrink-0 truncate">{step.label}</span>
                  <div className="flex-1 h-3 rounded-full bg-secondary/60 overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-[width]" style={{ width: `${Math.max(pct, step.count > 0 ? 3 : 0)}%` }} />
                  </div>
                  <span className="text-xs font-medium text-foreground w-20 shrink-0 text-right tabular-nums">
                    {step.count} · {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Pas encore assez de données sur cette période.</p>
        )}

        {funnel.cameraDeniedCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <CameraOff size={13} className="shrink-0" />
            {funnel.cameraDeniedCount} membre(s) ont rencontré un refus d&apos;accès à la caméra sur cette période.
          </div>
        )}
      </Card>
    </div>
  );
}
