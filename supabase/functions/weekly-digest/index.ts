// Digest hebdomadaire des recommandations fortes — envoyé une fois par semaine
// (cf. migration 20260808170000_weekly_digest_cron.sql pour la planification
// pg_cron) à chaque membre réel ayant activé `notify_email_digest`.
//
// Le moteur de scoring ci-dessous est une copie volontaire (et non un import)
// de src/domain/matching/compatibility.ts : les Edge Functions Deno ne
// résolvent pas les alias "@/..." du projet Next.js, donc dupliquer cette
// fonction pure évite toute fragilité de bundling. À garder synchronisée si
// la pondération change côté application.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml, escapeHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

interface ProfileRow {
  id: string;
  first_name: string;
  gender: "MALE" | "FEMALE";
  birth_date: string;
  city: string | null;
  country: string;
  profession: string | null;
  church_denomination: string | null;
  faith_engagement_level: string | null;
  desired_children_count: string | null;
  marriage_timeline: string | null;
  relocation_ready: boolean;
  core_values: string[];
  passions: string[];
  hobbies: string[];
  desired_countries: string[];
  desired_age_min: number;
  desired_age_max: number;
  avatar_url: string | null;
  why_marriage: string | null;
  notify_email_digest: boolean;
  is_test_account: boolean;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function intersection(a: string[], b: string[]): string[] {
  const setB = new Set(b.map(normalize));
  const seen = new Set<string>();
  return a.filter((item) => {
    const key = normalize(item);
    if (seen.has(key) || !setB.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  return intersection(a, b).length / Math.min(a.length, b.length);
}

function computeAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function computeCompatibility(viewer: ProfileRow, candidate: ProfileRow): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (viewer.church_denomination && candidate.church_denomination) {
    if (normalize(viewer.church_denomination) === normalize(candidate.church_denomination)) {
      score += 12;
      reasons.push("Vous partagez la même confession chrétienne");
    }
  }
  if (viewer.faith_engagement_level && candidate.faith_engagement_level) {
    if (normalize(viewer.faith_engagement_level) === normalize(candidate.faith_engagement_level)) {
      score += 8;
      reasons.push("Un engagement dans la foi de niveau similaire");
    }
  }

  const sharedValues = intersection(viewer.core_values, candidate.core_values);
  if (sharedValues.length > 0) {
    score += Math.round(overlapRatio(viewer.core_values, candidate.core_values) * 20);
    reasons.push(`Des valeurs communes : ${sharedValues.slice(0, 3).join(", ")}`);
  }

  const sharedInterests = intersection(viewer.hobbies, candidate.hobbies);
  if (sharedInterests.length > 0) {
    score += Math.round(overlapRatio(viewer.hobbies, candidate.hobbies) * 15);
    reasons.push(`Des centres d'intérêt communs : ${sharedInterests.slice(0, 3).join(", ")}`);
  }

  if (normalize(viewer.country) === normalize(candidate.country)) {
    score += 15;
    reasons.push("Vous vivez dans le même pays");
  } else {
    const viewerWantsCandidateCountry = viewer.desired_countries.some((c) => normalize(c) === normalize(candidate.country));
    const candidateWantsViewerCountry = candidate.desired_countries.some((c) => normalize(c) === normalize(viewer.country));
    if (viewerWantsCandidateCountry || candidateWantsViewerCountry) {
      score += 8;
      reasons.push("Votre localisation correspond à ce que vous recherchez");
    }
  }

  const viewerAge = computeAge(viewer.birth_date);
  const candidateAge = computeAge(candidate.birth_date);
  const candidateInViewerRange = candidateAge >= viewer.desired_age_min && candidateAge <= viewer.desired_age_max;
  const viewerInCandidateRange = viewerAge >= candidate.desired_age_min && viewerAge <= candidate.desired_age_max;
  if (candidateInViewerRange && viewerInCandidateRange) {
    score += 10;
    reasons.push("Vous correspondez tous les deux à la tranche d'âge recherchée");
  } else if (candidateInViewerRange || viewerInCandidateRange) {
    score += 5;
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DIGEST_FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const TOP_N = 3;

function renderEmailHtml(viewerFirstName: string, matches: { firstName: string; age: number; city: string | null; country: string; score: number; reasons: string[] }[]) {
  const rows = matches
    .map(
      (m) => `
      <tr>
        <td style="padding:16px;border-bottom:1px solid #eee;">
          <div style="font-weight:600;font-size:15px;color:#090A0F;">${escapeHtml(m.firstName)}, ${m.age} ans — ${m.score}%</div>
          <div style="font-size:13px;color:#64748B;margin-top:2px;">${m.city ? escapeHtml(m.city) + ", " : ""}${escapeHtml(m.country)}</div>
          ${m.reasons[0] ? `<div style="font-size:12px;color:#FE70B2;margin-top:6px;">✓ ${escapeHtml(m.reasons[0])}</div>` : ""}
        </td>
      </tr>`
    )
    .join("");

  return buildAgapeoEmailHtml({
    title: "Tes recommandations de la semaine",
    preheader: `${matches.length} nouvelle(s) recommandation(s) forte(s) cette semaine`,
    eyebrow: "RECOMMANDATIONS",
    headline: `${matches.length} nouvelle${matches.length > 1 ? "s" : ""} recommandation${matches.length > 1 ? "s" : ""} cette semaine`,
    recipientFirstName: viewerFirstName,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">Voici tes recommandations de compatibilité les plus fortes cette semaine sur Agapeo :</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>
      <p style="color:#94a3b8;font-size:11px;margin-top:16px;">
        Tu reçois cet email car tu as activé le résumé hebdomadaire dans tes préférences de notification. Tu peux le désactiver à tout moment depuis ton compte.
      </p>
    `,
    ctaText: "Voir mes recommandations",
    ctaUrl: `${SITE_URL}/discover`
  });
}

async function sendDigestEmail(to: string, firstName: string, matches: Awaited<ReturnType<typeof buildMatchesForViewer>>) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY manquant — email non envoyé.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: DIGEST_FROM_EMAIL,
      to: [to],
      subject: `${matches.length} nouvelle(s) recommandation(s) forte(s) cette semaine`,
      html: renderEmailHtml(firstName, matches)
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend a refusé l'envoi (${res.status}) : ${body}`);
  }
}

async function buildMatchesForViewer(viewer: ProfileRow, candidates: ProfileRow[]) {
  return candidates
    .map((candidate) => {
      const { score, reasons } = computeCompatibility(viewer, candidate);
      return { firstName: candidate.first_name, age: computeAge(candidate.birth_date), city: candidate.city, country: candidate.country, score, reasons };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: viewers, error: viewersErr } = await admin
    .from("profiles")
    .select("*")
    .eq("notify_email_digest", true)
    .eq("is_test_account", false)
    .not("avatar_url", "is", null)
    .not("church_denomination", "is", null)
    .not("why_marriage", "is", null);

  if (viewersErr) {
    return new Response(JSON.stringify({ error: viewersErr.message }), { status: 500 });
  }

  const results: { userId: string; sent: boolean; reason?: string }[] = [];

  for (const viewer of (viewers ?? []) as ProfileRow[]) {
    const targetGender = viewer.gender === "MALE" ? "FEMALE" : "MALE";
    const { data: candidates } = await admin
      .from("profiles")
      .select("*")
      .neq("id", viewer.id)
      .eq("gender", targetGender)
      .eq("is_test_account", false)
      .not("avatar_url", "is", null)
      .not("church_denomination", "is", null)
      .not("why_marriage", "is", null);

    const matches = await buildMatchesForViewer(viewer, (candidates ?? []) as ProfileRow[]);
    if (matches.length === 0) {
      results.push({ userId: viewer.id, sent: false, reason: "Aucune recommandation disponible" });
      continue;
    }

    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(viewer.id);
    const email = authUser?.user?.email;
    if (authErr || !email) {
      results.push({ userId: viewer.id, sent: false, reason: "Email introuvable" });
      continue;
    }

    try {
      await sendDigestEmail(email, viewer.first_name, matches);
      results.push({ userId: viewer.id, sent: true });
    } catch (err) {
      results.push({ userId: viewer.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { "Content-Type": "application/json" }
  });
});
