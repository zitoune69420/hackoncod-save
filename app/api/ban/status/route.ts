import { auth } from "@/app/auth";
import {
  DISCORD_ID_COOKIE,
  DISCORD_ID_COOKIE_MAX_AGE,
  signDiscordIdCookieValue,
} from "@/lib/auth/discord-id-cookie";
import { getClientIpFromHeaders } from "@/lib/banned/client-ip";
import { fetchRecordBanSignalsEdge } from "@/lib/banned/edge-record-ban";
import {
  findDiscordAccountId,
  resolveSessionBanStatus,
} from "@/lib/banned/site-ban-db";
import { getBetterAuthSecret } from "@/lib/env";
import { cookies as nextCookies, headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * État de blocage pour la session courante + IP (côté serveur).
 * Le client synchronise localStorage pour cohérence UX (non fiable pour la sécurité).
 *
 * Backfill : pose le cookie HMAC `hackoncod_did` pour les sessions Better Auth déjà
 * actives avant le déploiement (les nouveaux logins l'ont via le hook `after`).
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

    const jar = await nextCookies();
    const discordId = await findDiscordAccountId(session.user.id);

    /**
     * Backfill cookie HMAC pour les sessions actives avant le déploiement.
     * Les nouveaux logins l'ont via le hook `after` Better Auth.
     */
    if (!jar.get(DISCORD_ID_COOKIE)?.value && discordId) {
      const secret = getBetterAuthSecret()?.trim();
      if (secret) {
        const value = await signDiscordIdCookieValue(discordId, secret);
        if (value) {
          jar.set(DISCORD_ID_COOKIE, value, {
            path: "/",
            maxAge: DISCORD_ID_COOKIE_MAX_AGE,
            sameSite: "lax",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
          });
        }
      }
    }

    /**
     * Propagation : si le user est banni, capture tous les signaux dispo dans cette
     * requête (IP, fingerprint header, discord_id) dans banned_ips / banned_fingerprints.
     * Ferme le trou OAuth callback où le fingerprint n'est pas capturable au login.
     */
    if (status.banned) {
      void fetchRecordBanSignalsEdge({
        ip: getClientIpFromHeaders(h),
        fp: h.get("x-client-fingerprint"),
        did: discordId,
        reason: status.reason ?? "session-status-propagation",
      });
    }

    return NextResponse.json(status, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    console.error("[api/ban/status]", e);
    return NextResponse.json({ banned: false, reason: null });
  }
}
