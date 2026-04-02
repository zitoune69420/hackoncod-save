import { auth } from "@/app/auth";
import { resolveSessionBanStatus } from "@/lib/banned/site-ban-db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * État de blocage pour la session courante + IP (côté serveur).
 * Le client synchronise localStorage pour cohérence UX (non fiable pour la sécurité).
 */
export async function GET() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });

    if (!session?.user?.id) {
      return NextResponse.json({ banned: false, reason: null });
    }

    const status = await resolveSessionBanStatus({
      authUserId: session.user.id,
      requestHeaders: h,
    });

    return NextResponse.json(status, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    console.error("[api/ban/status]", e);
    return NextResponse.json({ banned: false, reason: null });
  }
}
