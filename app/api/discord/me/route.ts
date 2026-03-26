import {
  getCurrentUserAccess,
  getDiscordRoleResolutionDebug,
} from "@/lib/permissions-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const access = await getCurrentUserAccess({ source: "db" });

  if (!access.session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const debugRequested =
    req.nextUrl.searchParams.get("debug") === "1" &&
    process.env.DISCORD_ROLES_DEBUG === "1";

  const payload: Record<string, unknown> = {
    user: {
      id: access.session.user.id,
      image: access.session.user.image,
      name: access.session.user.name,
    },
    role: access.role,
  };

  if (debugRequested) {
    payload.roleDebug = await getDiscordRoleResolutionDebug(
      access.session.user.id,
      access.session.user,
    );
  }

  return NextResponse.json(payload);
}
