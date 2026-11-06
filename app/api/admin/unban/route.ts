import { requireFounderDiscordLive } from "@/lib/require-founder-live";
import { unbanEverywhere } from "@/lib/banned/site-ban-db";
import { tryGuildUnbanMember } from "@/lib/discord/guild-bans";
import { NextResponse } from "next/server";

const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;
const IP_RE = /^[0-9A-Fa-f.:]{2,45}$/;

function parseBody(
  raw: unknown,
): { discordId: string | null; ip: string | null } | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const did = typeof o.discordId === "string" ? o.discordId.trim() : "";
  const ip = typeof o.ip === "string" ? o.ip.trim() : "";
  if (did && !DISCORD_SNOWFLAKE_RE.test(did)) return null;
  if (ip && !IP_RE.test(ip)) return null;
  if (!did && !ip) return null;
  return { discordId: did || null, ip: ip || null };
}

/** Déban complet par Discord ID et/ou IP : tables de ban + ban Discord serveur. */
export async function POST(req: Request) {
  try {
    const gate = await requireFounderDiscordLive();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status },
      );
    }

    const parsed = parseBody(await req.json().catch(() => null));
    if (!parsed) {
      return NextResponse.json(
        { error: "Discord ID (snowflake) ou IP valide requis." },
        { status: 400 },
      );
    }

    const report = await unbanEverywhere(parsed);
    const discordUnban = parsed.discordId
      ? await tryGuildUnbanMember(parsed.discordId, "Hackoncod — déban (admin)")
      : null;

    return NextResponse.json({
      ok: true,
      report,
      discordUnbanned: discordUnban?.ok ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/unban POST]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
