import { getCurrentUserAccess } from "@/lib/permissions-server";
import {
  getAllGuildBans,
  presentationFromBanUser,
} from "@/lib/discord/guild-bans";
import {
  getDiscordUserPresentationsForUserIds,
  normalizeDiscordUserIdForLookup,
} from "@/lib/discord/guild-member-display";
import {
  getAllBlacklistForAdmin,
  insertBlacklist,
  type BlacklistUpsertRow,
} from "@/lib/supabase/queries";
import type { BlacklistEntry, BlacklistEntryWithDisplay } from "@/lib/supabase/types";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rows = await getAllBlacklistForAdmin();

    let discordBansError: string | undefined;
    const guildId = process.env.DISCORD_GUILD_ID?.trim() ?? "";
    let bans: Awaited<ReturnType<typeof getAllGuildBans>> = [];
    if (guildId) {
      try {
        bans = await getAllGuildBans(guildId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[api/admin/blacklist] getAllGuildBans:", msg);
        discordBansError =
          process.env.NODE_ENV === "production"
            ? "discord_bans_unavailable"
            : msg;
      }
    } else {
      discordBansError = "DISCORD_GUILD_ID missing";
    }

    const idSet = new Set<string>();
    for (const r of rows) {
      const u = normalizeDiscordUserIdForLookup(r.user_id);
      if (u) idSet.add(u);
      const a = normalizeDiscordUserIdForLookup(r.added_by);
      if (a) idSet.add(a);
    }
    const presentations = await getDiscordUserPresentationsForUserIds([
      ...idSet,
    ]);

    const dbByUserId = new Map<string, BlacklistEntry>();
    for (const r of rows) {
      const k = normalizeDiscordUserIdForLookup(r.user_id);
      if (k) dbByUserId.set(k, r);
    }

    const seenBannedUserIds = new Set<string>();
    const enriched: BlacklistEntryWithDisplay[] = [];

    for (const ban of bans) {
      const uid = ban.user.id;
      seenBannedUserIds.add(uid);
      const dbRow = dbByUserId.get(uid);
      const pres = presentationFromBanUser(uid, ban.user);
      const mergedReason =
        dbRow?.reason?.trim() ? dbRow.reason : ban.reason;

      if (dbRow) {
        const addedKey = normalizeDiscordUserIdForLookup(dbRow.added_by);
        const addedPres = addedKey ? presentations.get(addedKey) : undefined;
        enriched.push({
          ...dbRow,
          reason: mergedReason,
          discord_display: pres.displayName,
          discord_avatar_url: pres.avatarUrl,
          added_by_display: addedPres?.displayName ?? null,
          added_by_avatar_url: addedPres?.avatarUrl ?? null,
          db_row_id: dbRow.id,
          discord_ban: true,
        });
      } else {
        enriched.push({
          id: `discord-ban-${uid}`,
          user_id: uid,
          discord: null,
          reason: ban.reason,
          added_by: null,
          created_at: null,
          updated_at: null,
          discord_display: pres.displayName,
          discord_avatar_url: pres.avatarUrl,
          added_by_display: null,
          added_by_avatar_url: null,
          db_row_id: null,
          discord_ban: true,
        });
      }
    }

    for (const r of rows) {
      const k = normalizeDiscordUserIdForLookup(r.user_id);
      if (k && seenBannedUserIds.has(k)) continue;

      const uidKey = normalizeDiscordUserIdForLookup(r.user_id);
      const addedKey = normalizeDiscordUserIdForLookup(r.added_by);
      const memberPres = uidKey ? presentations.get(uidKey) : undefined;
      const addedPres = addedKey ? presentations.get(addedKey) : undefined;

      enriched.push({
        ...r,
        discord_display: memberPres?.displayName ?? null,
        discord_avatar_url: memberPres?.avatarUrl ?? null,
        added_by_display: addedPres?.displayName ?? null,
        added_by_avatar_url: addedPres?.avatarUrl ?? null,
        db_row_id: r.id,
        discord_ban: false,
      });
    }

    return NextResponse.json(
      {
        entries: enriched,
        ...(discordBansError ? { discordBansError } : {}),
      },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/blacklist GET]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

function nullIfEmpty(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t === "" ? null : t;
}

function normalizeBlacklistBody(raw: unknown): BlacklistUpsertRow | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const user_id = nullIfEmpty(o.user_id);
  const discord = nullIfEmpty(o.discord);
  if (!user_id && !discord) return null;

  return {
    user_id,
    discord,
    reason: nullIfEmpty(o.reason),
    added_by: nullIfEmpty(o.added_by),
  };
}

export async function POST(req: Request) {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const row = normalizeBlacklistBody(body);
    if (!row) {
      return NextResponse.json(
        {
          error:
            "Invalid body (at least one of user_id or discord required)",
        },
        { status: 400 },
      );
    }

    const { id } = await insertBlacklist(row);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/blacklist POST]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
