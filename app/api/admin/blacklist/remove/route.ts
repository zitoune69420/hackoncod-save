import { requireFounderDiscordLive } from "@/lib/require-founder-live";
import { purgeBanSideTablesForDiscordSnowflake } from "@/lib/banned/site-ban-db";
import { isUuid } from "@/lib/security/is-uuid";
import {
  discordSnowflakeFromBlacklistFields,
  tryGuildUnbanMember,
} from "@/lib/discord/guild-bans";
import {
  deleteBlacklist,
  getBlacklistRowById,
} from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

function readField(body: unknown, key: string): string {
  if (!body || typeof body !== "object") return "";
  const v = (body as Record<string, unknown>)[key];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Retire un membre de la liste noire : supprime la ligne en base (si présente)
 * ET lève le bannissement sur le serveur Discord (Guild Bans API).
 * Accepte `db_row_id` (UUID Supabase) et/ou `user_id` (snowflake Discord).
 */
export async function POST(req: Request) {
  try {
    const gate = await requireFounderDiscordLive();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status },
      );
    }

    const body = await req.json().catch(() => null);
    const dbRowId = readField(body, "db_row_id");
    let snowflake = discordSnowflakeFromBlacklistFields(
      readField(body, "user_id") || null,
      readField(body, "discord") || null,
    );

    // Supprime la ligne en base si un UUID valide est fourni.
    if (dbRowId) {
      if (!isUuid(dbRowId)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      }
      const existing = await getBlacklistRowById(dbRowId);
      if (existing) {
        if (!snowflake) {
          snowflake = discordSnowflakeFromBlacklistFields(
            existing.user_id,
            existing.discord,
          );
        }
        await deleteBlacklist(dbRowId);
        if (snowflake) {
          await purgeBanSideTablesForDiscordSnowflake(snowflake);
        }
      }
    }

    if (!dbRowId && !snowflake) {
      return NextResponse.json(
        { error: "user_id (snowflake Discord) ou db_row_id requis." },
        { status: 400 },
      );
    }

    // Lève le ban Discord (best-effort, idempotent si déjà débanni).
    let discordUnban: { ok: boolean; status?: number; detail?: string } = {
      ok: true,
    };
    if (snowflake) {
      discordUnban = await tryGuildUnbanMember(
        snowflake,
        "Hackoncod — retrait de la liste noire (admin)",
      );
    }

    return NextResponse.json({ ok: true, discordUnban });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/blacklist/remove POST]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
