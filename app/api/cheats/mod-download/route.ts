import {
  canAccessVipCheats,
  hasMinimumRole,
} from "@/lib/permissions";
import { getCurrentUserAccess } from "@/lib/permissions-server";
import { resolveCheatDownloadUrl } from "@/lib/cheat-download-server";
import { getCheatLinkFlagsById } from "@/lib/supabase/queries";
import { isUuid } from "@/lib/security/is-uuid";
import { NextResponse } from "next/server";

const SIGNED_URL_SECONDS = 120;

export async function GET(req: Request) {
  const access = await getCurrentUserAccess({ source: "live" });
  if (!access.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cheatId = searchParams.get("cheatId")?.trim() ?? "";
  const kind = searchParams.get("kind")?.trim().toLowerCase();

  if (!cheatId || !isUuid(cheatId)) {
    return NextResponse.json({ error: "Invalid cheatId" }, { status: 400 });
  }
  if (kind !== "vip" && kind !== "semivip") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  if (kind === "vip") {
    if (!canAccessVipCheats(access.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!hasMinimumRole(access.role, "semivip")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row = await getCheatLinkFlagsById(cheatId);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (kind === "vip" && !row.vip) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (kind === "semivip" && !row.semi_vip) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolved = await resolveCheatDownloadUrl(row.link, SIGNED_URL_SECONDS);
  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status ?? 500 },
    );
  }

  return NextResponse.json({
    url: resolved.url,
    external: Boolean(resolved.external),
    expiresIn: resolved.external ? undefined : SIGNED_URL_SECONDS,
  });
}
