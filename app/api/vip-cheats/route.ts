import { auth } from "@/app/auth";
import { hasPermissions } from "@/lib/permissions";
import { resolveUserRoleForUserId } from "@/lib/permissions-server";
import { getVipCheats } from "@/lib/supabase/queries";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !hasPermissions(
      await resolveUserRoleForUserId(session.user.id, session.user),
      ["vip"],
    )
  ) {
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
