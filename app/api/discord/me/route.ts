import { auth } from "@/app/auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

/**
 * Exemple de route sous `/api/discord` : vérifie la session Better Auth.
 * Étendre ici avec des appels Discord (token utilisateur, bot, etc.).
 */
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      image: session.user.image,
    },
  })
}
