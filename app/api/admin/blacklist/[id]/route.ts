import {
  findDiscordAccountId,
  purgeBanSideTablesForDiscordSnowflake,
} from "@/lib/banned/site-ban-db";
import {
  buildBlacklistUpsertRow,
  parseBlacklistWriteBody,
} from "@/lib/blacklist/admin-blacklist-write";
import { getCurrentUserAccess } from "@/lib/permissions-server";
import { isUuid } from "@/lib/security/is-uuid";
import {
  discordSnowflakeFromBlacklistFields,
  tryGuildBanMemberForBlock,
} from "@/lib/discord/guild-bans";
import {
  deleteBlacklist,
  getBlacklistRowById,
  updateBlacklist,
} from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

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

    const sessionUserId = access.session?.user?.id;
    if (!sessionUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = parseBlacklistWriteBody(body);
    if (!parsed) {
      return NextResponse.json(
        {
          error: "Invalid body (user_id snowflake Discord requis)",
        },
        { status: 400 },
      );
    }

    const actorDiscordId = await findDiscordAccountId(sessionUserId);
    if (!actorDiscordId) {
      return NextResponse.json(
        {
          error:
            "Impossible de résoudre ton compte Discord (connecte-toi avec Discord).",
        },
        { status: 400 },
      );
    }

    const row = await buildBlacklistUpsertRow({
      user_id: parsed.user_id,
      reason: parsed.reason,
      added_by: actorDiscordId,
    });

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
