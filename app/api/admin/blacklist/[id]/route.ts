import { getCurrentUserAccess } from "@/lib/permissions-server";
import { isUuid } from "@/lib/security/is-uuid";
import {
  discordSnowflakeFromBlacklistFields,
  tryGuildBanMemberForBlock,
} from "@/lib/discord/guild-bans";
import { purgeBanSideTablesForDiscordSnowflake } from "@/lib/banned/site-ban-db";
import {
  deleteBlacklist,
  getBlacklistRowById,
  type BlacklistUpsertRow,
  updateBlacklist,
} from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const idTrim = id?.trim() ?? "";
    if (!idTrim || !isUuid(idTrim)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
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

    await updateBlacklist(idTrim, row);

    const targetSnowflake = discordSnowflakeFromBlacklistFields(
      row.user_id,
      row.discord,
    );
    await tryGuildBanMemberForBlock(
      targetSnowflake,
      row.reason ?? "Liste noire Hackoncod (mise à jour)",
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/blacklist PATCH]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const idTrim = id?.trim() ?? "";
    if (!idTrim || !isUuid(idTrim)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await getBlacklistRowById(idTrim);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const targetSnowflake = discordSnowflakeFromBlacklistFields(
      existing.user_id,
      existing.discord,
    );

    await deleteBlacklist(idTrim);
    await purgeBanSideTablesForDiscordSnowflake(targetSnowflake);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/blacklist DELETE]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
