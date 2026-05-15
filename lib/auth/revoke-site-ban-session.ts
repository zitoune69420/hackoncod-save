import "server-only";

import { deleteSessionCookie } from "better-auth/cookies";
import {
  getClientIpFromHeaders,
  insertBannedFingerprintRow,
  insertBannedIpRow,
} from "@/lib/banned/site-ban-db";
import { tryGuildBanMemberForBlock } from "@/lib/discord/guild-bans";

const SITE_BLOCKED_COOKIE =
  "hackoncod_site_blocked=1; Path=/; Max-Age=604800; SameSite=Lax";

/** Context hook Better Auth (éviter import de types internes fragiles). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthHookCtx = any;

/**
 * Enregistre IP + Discord dans banned_ips, révoque la session, renvoie une réponse
 * à retourner depuis le hook `after` ({ response }) pour remplacer le redirect OAuth.
 */
export async function buildSiteBanOAuthResponse(
  ctx: AuthHookCtx,
  authUserId: string,
  reason: string | null,
): Promise<Response> {
  const headers = ctx.headers as Headers | undefined;
  const ip = headers ? getClientIpFromHeaders(headers) : "unknown";

  let discordId: string | null = null;
  try {
    const accounts = await ctx.context.internalAdapter.findAccounts(authUserId);
    const discord = accounts.find(
      (a: { providerId?: string }) => a.providerId === "discord",
    );
    if (discord?.accountId) discordId = String(discord.accountId);
  } catch {
    /* ignore */
  }

  await insertBannedIpRow({
    ip: ip || "unknown",
    discord_id: discordId,
    reason: reason?.trim() || "site_banned",
  });

  /**
   * Capture aussi le fingerprint si le header est présent. En pratique le callback
   * OAuth est un redirect Discord -> notre app sans `X-Client-Fingerprint`,
   * mais on garde la branche pour les flows où Better Auth est appelé via fetch().
   */
  const fp = headers?.get("x-client-fingerprint")?.trim();
  if (fp) {
    await insertBannedFingerprintRow({
      fingerprint: fp,
      discord_id: discordId,
      reason: reason?.trim() || "site_banned",
    });
  }

  await tryGuildBanMemberForBlock(
    discordId,
    reason?.trim() || "Blocage site Hackoncod",
  );

  try {
    const token = await ctx.getSignedCookie(
      ctx.context.authCookies.sessionToken.name,
      ctx.context.secret,
    );
    if (token) await ctx.context.internalAdapter.deleteSession(token);
  } catch (e) {
    console.error("[site-ban] deleteSession", e);
  }

  deleteSessionCookie(ctx);

  const baseRaw = ctx.context.baseURL ?? "";
  const base = String(baseRaw).replace(/\/$/, "");
  const q = new URLSearchParams();
  if (reason?.trim()) q.set("reason", reason.trim());
  const loc = `${base}/banned${q.toString() ? `?${q}` : ""}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: loc,
      "Set-Cookie": SITE_BLOCKED_COOKIE,
    },
  });
}
