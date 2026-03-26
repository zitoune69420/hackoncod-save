/**
 * Insère des données de test dans analytics_page_views (interface admin stats).
 *
 * Prérequis : .env.local avec NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * et avoir exécuté sql/analytics_page_views.sql sur le projet.
 *
 * Usage :
 *   npx tsx scripts/seed-analytics.ts
 *   npx tsx scripts/seed-analytics.ts --reset   # supprime d'abord les lignes seed-*
 *   npx tsx scripts/seed-analytics.ts --days 14 --events 2500
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): void {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) {
    return;
  }
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

const TABLE =
  process.env.SUPABASE_ANALYTICS_TABLE?.trim() || "analytics_page_views";

const PATHS = [
  { p: "/", w: 28 },
  { p: "/dashboard", w: 22 },
  { p: "/dashboard?page=cheats", w: 6 },
  { p: "/files", w: 4 },
  { p: "/uploads/Bossam%20V6%20MP.rar", w: 3 },
  { p: "/downloads", w: 5 },
  { p: "/pricing", w: 4 },
  { p: "/support", w: 3 },
  { p: "/forum", w: 5 },
  { p: "/blog/changelog", w: 2 },
] as const;

const REFERRERS = [
  { host: "google.com", full: "https://www.google.com/", w: 44 },
  { host: "discord.com", full: "https://discord.com/channels/…", w: 16 },
  { host: "youtube.com", full: "https://www.youtube.com/watch?v=…", w: 10 },
  { host: "twitter.com", full: "https://twitter.com/", w: 5 },
  { host: "reddit.com", full: "https://www.reddit.com/", w: 6 },
  { host: null as string | null, full: null as string | null, w: 19 }, // direct
] as const;

const COUNTRIES = [
  { code: "FR", w: 25 },
  { code: "US", w: 14 },
  { code: "GB", w: 7 },
  { code: "DE", w: 4 },
  { code: "ES", w: 4 },
  { code: "CA", w: 6 },
  { code: "BR", w: 5 },
  { code: "XX", w: 35 }, // inconnu / autre
] as const;

function pick<T extends { w: number }>(items: readonly T[]): T {
  const total = items.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of items) {
    r -= x.w;
    if (r <= 0) {
      return x;
    }
  }
  return items[items.length - 1]!;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomUtm(): { source: string; medium: string; campaign: string } {
  const u = pick([
    { source: "newsletter", medium: "email", campaign: "launch", w: 40 },
    { source: "discord", medium: "social", campaign: "invite", w: 35 },
    { source: "google", medium: "cpc", campaign: "brand", w: 25 },
  ]);
  return { source: u.source, medium: u.medium, campaign: u.campaign };
}

type Row = {
  created_at: string;
  path: string;
  hostname: string | null;
  referrer: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country_code: string | null;
  device_type: string;
  browser: string;
  os: string;
  visitor_id: string;
  session_id: string;
};

function buildRows(args: { days: number; targetEvents: number }): Row[] {
  const { days, targetEvents } = args;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const host =
    process.env.SEED_ANALYTICS_HOSTNAME?.trim() || "localhost:3000";

  const visitors: string[] = [];
  const visitorCount = Math.max(40, Math.round(targetEvents / 25));
  for (let i = 0; i < visitorCount; i++) {
    visitors.push(`seed-v-${crypto.randomUUID()}`);
  }

  const rows: Row[] = [];

  while (rows.length < targetEvents) {
    const visitor_id = visitors[randomInt(0, visitors.length - 1)]!;
    const session_id = `seed-s-${crypto.randomUUID()}`;

    const dayOffset = randomInt(0, days - 1);
    const baseDay = now - dayOffset * dayMs;
    const sessionStart = baseDay + randomInt(0, dayMs - 1);

    const ref = pick(REFERRERS);
    const isDirect = ref.host == null;
    const country = pick(COUNTRIES);
    const mobile = Math.random() < 0.26;

    const device_type = mobile ? "mobile" : "desktop";
    const browser = mobile
      ? pick([
          { b: "Mobile Safari", w: 55 },
          { b: "Chrome", w: 40 },
          { b: "Samsung Internet", w: 5 },
        ]).b
      : pick([
          { b: "Chrome", w: 62 },
          { b: "Firefox", w: 14 },
          { b: "Edge", w: 12 },
          { b: "Safari", w: 12 },
        ]).b;
    const os = mobile
      ? pick([
          { o: "Android", w: 55 },
          { o: "iOS", w: 45 },
        ]).o
      : pick([
          { o: "Windows", w: 72 },
          { o: "GNU/Linux", w: 8 },
          { o: "macOS", w: 18 },
          { o: "Chrome OS", w: 2 },
        ]).o;

    const withUtm = Math.random() < 0.08 && !isDirect;
    const utmRoll = withUtm ? randomUtm() : null;
    const utm_source = utmRoll?.source ?? null;
    const utm_medium = utmRoll?.medium ?? null;
    const utm_campaign = utmRoll?.campaign ?? null;

    const viewsInSession = Math.random() < 0.32 ? 1 : randomInt(2, 6);
    for (let v = 0; v < viewsInSession; v++) {
      const t = sessionStart + v * randomInt(5_000, 120_000);
      const pathItem = pick(PATHS);
      rows.push({
        created_at: new Date(Math.min(t, now)).toISOString(),
        path: pathItem.p.split("?")[0] ?? pathItem.p,
        hostname: host,
        referrer: isDirect ? null : ref.full,
        referrer_host: isDirect ? null : ref.host,
        utm_source: v === 0 ? utm_source : null,
        utm_medium: v === 0 ? utm_medium : null,
        utm_campaign: v === 0 ? utm_campaign : null,
        country_code: country.code === "XX" ? null : country.code,
        device_type,
        browser,
        os,
        visitor_id,
        session_id,
      });
      if (rows.length >= targetEvents) {
        break;
      }
    }
  }

  return rows.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const reset = argv.includes("--reset");
  let days = 7;
  let targetEvents = 1800;
  const di = argv.indexOf("--days");
  if (di >= 0) {
    const n = Number.parseInt(argv[di + 1] ?? "", 10);
    if (Number.isFinite(n) && n > 0 && n <= 90) {
      days = n;
    }
  }
  const ei = argv.indexOf("--events");
  if (ei >= 0) {
    const n = Number.parseInt(argv[ei + 1] ?? "", 10);
    if (Number.isFinite(n) && n > 0 && n <= 50_000) {
      targetEvents = n;
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (voir .env.local).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (reset) {
    const { error: delErr } = await supabase
      .from(TABLE)
      .delete()
      .like("visitor_id", "seed-v-%");
    if (delErr) {
      console.error("Suppression seed :", delErr.message);
      process.exit(1);
    }
    console.log("Anciennes lignes seed-v-* supprimées.");
  }

  const rows = buildRows({ days, targetEvents });
  const batch = 400;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const { error } = await supabase.from(TABLE).insert(chunk);
    if (error) {
      console.error(`Insert batch ${i} :`, error.message);
      process.exit(1);
    }
    console.log(`Inséré ${Math.min(i + batch, rows.length)} / ${rows.length}`);
  }

  console.log(
    `OK — ${rows.length} événements sur ~${days} jours (visitor_id préfixe seed-v-).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
