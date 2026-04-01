import { resolveCheatDownloadUrl } from "@/lib/cheat-download-server";
import { getCheatLinkFlagsById } from "@/lib/supabase/queries";
import { isUuid } from "@/lib/security/is-uuid";
import { NextResponse } from "next/server";

const SIGNED_URL_SECONDS = 180;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cheatId = searchParams.get("cheatId")?.trim() ?? "";

  if (!cheatId || !isUuid(cheatId)) {
    return NextResponse.json({ error: "Invalid cheatId" }, { status: 400 });
  }

  const row = await getCheatLinkFlagsById(cheatId);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.vip || row.semi_vip) {
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
