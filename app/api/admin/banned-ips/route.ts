import { listAllBannedIpsForAdmin } from "@/lib/banned/site-ban-db";
import {
  getDiscordUserPresentationsForUserIds,
  normalizeDiscordUserIdForLookup,
} from "@/lib/discord/guild-member-display";
import { getCurrentUserAccess } from "@/lib/permissions-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const access = await getCurrentUserAccess({ source: "db" });
    if (!access.isAuthenticated || access.role !== "founder") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const entries = await listAllBannedIpsForAdmin();
    const idSet = new Set<string>();
    for (const e of entries) {
      const id = normalizeDiscordUserIdForLookup(e.discord_id);
      if (id) idSet.add(id);
    }
    const presMap = await getDiscordUserPresentationsForUserIds([...idSet]);
    const discordPresentations = Object.fromEntries(
      [...presMap.entries()].map(([k, v]) => [
        k,
        { displayName: v.displayName, avatarUrl: v.avatarUrl },
      ]),
    );

    return NextResponse.json(
      { entries, discordPresentations },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/banned-ips GET]", message);
    const safeMessage =
      process.env.NODE_ENV === "production" ? "Request failed" : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
