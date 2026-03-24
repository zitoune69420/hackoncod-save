import { auth } from "@/app/auth";
import { resolveUserRoleForUserId } from "@/lib/permissions-server";
import { getRolePermissions } from "@/lib/permissions";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Exemple de route sous `/api/discord` : vérifie la session Better Auth.
 * Étendre ici avec des appels Discord (token utilisateur, bot, etc.).
 */
export async function GET() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await resolveUserRoleForUserId(session.user.id, session.user);
  const permissions = getRolePermissions(role);

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      image: session.user.image,
    },
    role,
    permissions,
  });
}
