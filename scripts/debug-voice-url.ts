import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const ACCESS_TOKEN = process.argv[2];
const REFRESH_TOKEN = process.argv[3];
const PATH = process.argv[4];

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error: sessionErr } = await supabase.auth.setSession({ access_token: ACCESS_TOKEN, refresh_token: REFRESH_TOKEN });
  if (sessionErr) {
    console.error("setSession error:", sessionErr);
    return;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  console.log("Authenticated as:", user?.email, user?.id);

  const { data, error } = await supabase.storage.from("message-attachments").createSignedUrls([PATH], 3600);
  console.log("createSignedUrls result:");
  console.log("  error:", error);
  console.log("  data:", JSON.stringify(data, null, 2));
}

main().catch((err) => console.error("Fatal:", err));
