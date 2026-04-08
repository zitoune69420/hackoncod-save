import "server-only";

import { isIP } from "node:net";
import {
  getDiscordUserPresentationsForUserIds,
  normalizeDiscordUserIdForLookup,
} from "@/lib/discord/guild-member-display";
import type { BlacklistUpsertRow } from "@/lib/supabase/queries";

function nullIfEmpty(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t === "" ? null : t;
}

export type BlacklistPostParsed =
  | { kind: "discord"; user_id: string; reason: string | null }
  | {
      kind: "ip";
      ip: string;
      discord_user_id: string | null;
      reason: string | null;
    };

function parseValidatedIp(ipRaw: string): string | null {
  const t = ipRaw.trim();
  if (!t) return null;
  if (isIP(t) === 0) return null;
  return t;
}

/** Corps POST blacklist : mode `discord` (défaut) ou `ip`. */
export function parseBlacklistPostBody(raw: unknown): BlacklistPostParsed | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const modeRaw =
    typeof o.mode === "string" ? o.mode.trim().toLowerCase() : "discord";

  if (modeRaw === "ip") {
    const ip = typeof o.ip === "string" ? parseValidatedIp(o.ip) : null;
    if (!ip) return null;
    const discordRaw =
      typeof o.discord_user_id === "string" ? o.discord_user_id.trim() : "";
    let discord_user_id: string | null = null;
    if (discordRaw) {
      if (!normalizeDiscordUserIdForLookup(discordRaw)) return null;
      discord_user_id = discordRaw;
    }
    return {
      kind: "ip",
      ip,
      discord_user_id,
      reason: nullIfEmpty(o.reason),
    };
  }

  const user_id =
    typeof o.user_id === "string" ? o.user_id.trim() : "";
  if (!user_id || !normalizeDiscordUserIdForLookup(user_id)) return null;
  return {
    kind: "discord",
    user_id,
    reason: nullIfEmpty(o.reason),
  };
}

/** @deprecated Utiliser parseBlacklistPostBody */
export function parseBlacklistWriteBody(
  raw: unknown,
): { user_id: string; reason: string | null } | null {
  const p = parseBlacklistPostBody(raw);
  if (!p || p.kind !== "discord") return null;
  return { user_id: p.user_id, reason: p.reason };
}

export async function buildBlacklistUpsertRow(input: {
  user_id: string;
  reason: string | null;
  added_by: string | null;
}): Promise<BlacklistUpsertRow> {
  const pres = await getDiscordUserPresentationsForUserIds([input.user_id]);
  const key = normalizeDiscordUserIdForLookup(input.user_id);
  const discordDisplay = key ? (pres.get(key)?.displayName ?? null) : null;
  return {
    user_id: input.user_id,
    discord: discordDisplay,
    reason: input.reason,
    added_by: input.added_by,
  };
}
