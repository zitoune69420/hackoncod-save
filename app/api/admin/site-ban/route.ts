import { getCurrentUserAccess } from "@/lib/permissions-server";
import {
  deleteBannedIpsByDiscordId,
  findDiscordAccountId,
  setUserSiteBan,
} from "@/lib/banned/site-ban-db";
import { tryGuildBanMemberForBlock } from "@/lib/discord/guild-bans";
import { NextResponse } from "next/server";

function parseBody(raw: unknown): {
  targetAuthUserId: string;
  siteBanned: boolean;
  reason: string | null;
} | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const targetAuthUserId =
    typeof o.targetAuthUserId === "string"
      ? o.targetAuthUserId.trim()
      : typeof o.authUserId === "string"
        ? o.authUserId.trim()
        : "";
  if (!targetAuthUserId) return null;
  const siteBanned = Boolean(o.siteBanned ?? o.site_banned);
  const reason =
    typeof o.reason === "string" && o.reason.trim() ? o.reason.trim() : null;
  return { targetAuthUserId, siteBanned, reason };
}

export async function POST(req: Request) {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = parseBody(body);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid body (targetAuthUserId, siteBanned)" },
        { status: 400 },
      );
    }

    const result = await setUserSiteBan({
      authUserId: parsed.targetAuthUserId,
      siteBanned: parsed.siteBanned,
      reason: parsed.reason,
    });

    if (!result.ok) {
      const safeOp =
        process.env.NODE_ENV === "production"
          ? "Operation failed"
          : result.message;
      return NextResponse.json({ error: safeOp }, { status: 400 });
    }

    if (parsed.siteBanned) {
      const discordId = await findDiscordAccountId(parsed.targetAuthUserId);
      await tryGuildBanMemberForBlock(
        discordId,
        parsed.reason ?? "Bannissement site (admin)",
      );
    } else {
      const discordId = await findDiscordAccountId(parsed.targetAuthUserId);
      if (discordId) await deleteBannedIpsByDiscordId(discordId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/site-ban]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
