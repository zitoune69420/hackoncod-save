/**
 * Whitelist ban-proof : snowflakes Discord qui ne peuvent jamais être bannis,
 * peu importe l'état des tables `banned_ips`, `banned_fingerprints`, `retard`,
 * `users.site_banned`, ou les bans serveur Discord.
 *
 * Lu depuis l'env `HACKONCOD_BAN_WHITELIST_DISCORD_IDS` (CSV de snowflakes).
 * Pas de préfixe `NEXT_PUBLIC_` → jamais bundlé côté client.
 *
 * Utilisable en Edge runtime (middleware) et en Node (route handlers, hook OAuth).
 */

const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;

let cached: { raw: string; set: Set<string> } | null = null;

function parseWhitelist(raw: string): Set<string> {
  const out = new Set<string>();
  for (const part of raw.split(/[,;\s]+/)) {
    const v = part.trim();
    if (v && DISCORD_SNOWFLAKE_RE.test(v)) out.add(v);
  }
  return out;
}

function getWhitelistSet(): Set<string> {
  const raw = process.env.HACKONCOD_BAN_WHITELIST_DISCORD_IDS?.trim() ?? "";
  if (!raw) return new Set();
  if (cached && cached.raw === raw) return cached.set;
  const set = parseWhitelist(raw);
  cached = { raw, set };
  return set;
}

export function isDiscordIdBanWhitelisted(
  discordId: string | null | undefined,
): boolean {
  const id = discordId?.trim();
  if (!id || !DISCORD_SNOWFLAKE_RE.test(id)) return false;
  return getWhitelistSet().has(id);
}
