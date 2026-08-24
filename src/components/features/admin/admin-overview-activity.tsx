"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollableRow } from "@/components/ui/scrollable-row";
import { UserCheck, MessageSquare, FileText, Heart, Receipt } from "lucide-react";

interface TimestampRow {
  created_at: string;
}

export interface AdminOverviewActivityProps {
  newUsers: TimestampRow[];
  messages: TimestampRow[];
  conversations: TimestampRow[];
  personalPosts: TimestampRow[];
  officialPosts: TimestampRow[];
  favorites: TimestampRow[];
  transactions: TimestampRow[];
}

const RANGE_PRESETS = [
  { id: "7d", label: "7 derniers jours", days: 7 },
  { id: "30d", label: "30 derniers jours", days: 30 },
  { id: "90d", label: "90 derniers jours", days: 90 },
  { id: "all", label: "Depuis le début", days: null as number | null }
];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function countInRange(rows: TimestampRow[], from: string, to: string) {
  return rows.filter((r) => {
    const day = r.created_at.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }).length;
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

  const counts = useMemo(
    () => ({
      newUsers: countInRange(props.newUsers, dateFrom, dateTo),
      messages: countInRange(props.messages, dateFrom, dateTo),
      conversations: countInRange(props.conversations, dateFrom, dateTo),
      personalPosts: countInRange(props.personalPosts, dateFrom, dateTo),
      officialPosts: countInRange(props.officialPosts, dateFrom, dateTo),
      favorites: countInRange(props.favorites, dateFrom, dateTo),
      transactions: countInRange(props.transactions, dateFrom, dateTo)
    }),
    [props, dateFrom, dateTo]
  );

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
    </div>
  );
}
