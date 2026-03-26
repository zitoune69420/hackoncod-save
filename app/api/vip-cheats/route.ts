import { canAccessVipCheats } from "@/lib/permissions";
import { getCurrentUserAccess } from "@/lib/permissions-server";
import { getVipCheats } from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

export async function GET() {
  const access = await getCurrentUserAccess({ source: "live" });

  if (!access.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessVipCheats(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cheats = await getVipCheats();

  const tableData = cheats.map((c) => ({
    id: c.id,
    name: c.name,
    game: Array.isArray(c.game)
      ? (c.game[0]?.title ?? "")
      : (c.game?.title ?? ""),
    mode: c.mode,
    extension: c.extension,
    crack: c.crack,
    client: c.client,
    link: c.link,
  }));

  return NextResponse.json(tableData);
}
