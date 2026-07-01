import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isDiscordIdBanWhitelisted } from "@/lib/auth/ban-whitelist";
import {
  DISCORD_ID_COOKIE,
  verifyDiscordIdCookieValue,
} from "@/lib/auth/discord-id-cookie";
import { fetchIsDiscordBannedEdge } from "@/lib/banned/edge-discord-ban";
import { fetchIsFingerprintBannedEdge } from "@/lib/banned/edge-fingerprint-ban";
import { fetchIsIpBannedEdge } from "@/lib/banned/edge-ip-ban";
import { fetchRecordBanSignalsEdge } from "@/lib/banned/edge-record-ban";
import { getClientIpFromHeaders } from "@/lib/banned/client-ip";
import {
  isBlockedAutomationUserAgent,
  isTrustedBotUserAgent,
} from "@/lib/security/edge-bot-ua";
import { edgeRateLimitAllow } from "@/lib/security/edge-rate-limit";
import { isBlockedVpnOrProxyEdge } from "@/lib/security/edge-vpn-check";
import { timingSafeEqualUtf8 } from "@/lib/security/timing-safe-utf8";

const AUTH_API_PREFIX = "/api/auth";
const MESSENGER_PATH = "/api/messenger";
const ANALYTICS_COLLECT = "/api/analytics/collect";
const SITE_BLOCKED = "hackoncod_site_blocked";
const FINGERPRINT_HEADER = "x-client-fingerprint";

function getClientIp(req: NextRequest): string {
  return getClientIpFromHeaders(req.headers);
}

/**
 * Récupère le Discord ID prouvé par le cookie HMAC (ou null si absent/forgé).
 * Utilisé pour la whitelist côté Edge avant tout check DB.
 */
async function verifiedDiscordIdFromRequest(
  req: NextRequest,
): Promise<string | null> {
  const raw = req.cookies.get(DISCORD_ID_COOKIE)?.value;
  if (!raw) return null;
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  return verifyDiscordIdCookieValue(raw, secret);
}

/** Loopback : présent uniquement en dev local, jamais derrière un reverse proxy en prod. */
function isLoopbackIp(ip: string): boolean {
  return ip === "::1" || ip === "127.0.0.1" || ip.startsWith("127.");
}

/**
 * Identifie la session Better Auth pour le rate-limit per-user.
 * Couvre les deux noms : `better-auth.session_token` (dev/http) et la variante
 * `__Secure-` préfixée en prod (cookies secure). Retourne null si non connecté.
 */
function getSessionRateLimitKey(req: NextRequest): string | null {
  const candidates = [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
  ];
  for (const name of candidates) {
    const c = req.cookies.get(name)?.value;
    if (c && c.length > 0) {
      // Le token signé contient `.` séparant l'id de la signature ; on prend l'id.
      const idPart = c.split(".")[0];
      if (idPart && idPart.length > 0) return idPart.slice(0, 64);
    }
  }
  return null;
}

function normalizeHostname(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

function allowedHostnames(req: NextRequest): Set<string> {
  const out = new Set<string>();
  const addHost = (h: string | undefined) => {
    if (!h?.trim()) return;
    out.add(normalizeHostname(h));
  };

  addHost(req.nextUrl.hostname);

  for (const raw of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
  ]) {
    const u = raw?.trim();
    if (!u) continue;
    try {
      const url = u.includes("://") ? new URL(u) : new URL(`https://${u}`);
      addHost(url.hostname);
    } catch {
      /* ignore invalid URL */
    }
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").split("/")[0];
    addHost(host);
  }

  return out;
}

function hostnameAllowed(host: string | null, allowed: Set<string>): boolean {
  if (!host?.trim()) return false;
  return allowed.has(normalizeHostname(host));
}

/**
 * Filtre les appels API : métadonnées Fetch navigateur + origine ou referer autorisé.
 * Mutations → `Sec-Fetch-Mode: cors` obligatoire.
 */
function isTrustedApiCaller(req: NextRequest): boolean {
  const mode = req.headers.get("sec-fetch-mode");
  const mutates = req.method !== "GET" && req.method !== "HEAD";
  if (mutates) {
    if (mode !== "cors") return false;
  } else if (mode && mode !== "cors" && mode !== "same-origin") {
    return false;
  }

  const sfs = req.headers.get("sec-fetch-site");
  if (sfs !== "same-origin" && sfs !== "same-site") {
    return false;
  }

  const allowed = allowedHostnames(req);

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return hostnameAllowed(new URL(origin).hostname, allowed);
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return hostnameAllowed(new URL(referer).hostname, allowed);
    } catch {
      return false;
    }
  }

  return false;
}

function messengerBearerOk(req: NextRequest): boolean {
  const secret = process.env.MESSENGER_API_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  return Boolean(token && timingSafeEqualUtf8(token, secret));
}

function redirectToBanned(req: NextRequest, setMarkerCookie: boolean) {
  const url = req.nextUrl.clone();
  url.pathname = "/banned";
  url.search = "";
  const res = NextResponse.redirect(url);
  if (setMarkerCookie) {
    res.cookies.set(SITE_BLOCKED, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      httpOnly: true,
    });
  }
  return res;
}

function jsonForbidden(reason?: string, setMarkerCookie = false) {
  const res = NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (reason) res.headers.set("x-mw-block", reason);
  if (setMarkerCookie) {
    res.cookies.set(SITE_BLOCKED, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      httpOnly: true,
    });
  }
  return res;
}

function tooMany() {
  return NextResponse.json(
    { error: "Too Many Requests" },
    { status: 429, headers: { "Retry-After": "60" } },
  );
}

type BanSignals = {
  ip: string | null;
  fp: string | null;
  did: string | null;
};

/**
 * Vérifications ban (IP, fingerprint, Discord) lancées en parallèle.
 * Toute source qui répond `true` suffit à bloquer ; chaque appel a son propre fail-open
 * pour ne pas fermer le site si Supabase est indisponible.
 *
 * Retourne aussi les signaux observés (IP, fingerprint, discord_id) afin que le
 * middleware puisse propager ces signaux dans `banned_ips` / `banned_fingerprints`
 * via `record_ban_signals` quand un ban est détecté.
 */
async function runBanChecks(req: NextRequest, opts: {
  ip: string;
  skipFingerprint: boolean;
  skipDiscord: boolean;
}): Promise<{ banned: boolean; reason?: string; signals: BanSignals }> {
  const checks: Promise<{ banned: boolean; reason: string } | null>[] = [];
  const signals: BanSignals = { ip: null, fp: null, did: null };

  if (opts.ip !== "unknown" && !isLoopbackIp(opts.ip)) {
    signals.ip = opts.ip;
    checks.push(
      fetchIsIpBannedEdge(opts.ip)
        .then((b) => (b ? { banned: true, reason: "ip-banned" } : null))
        .catch(() => null),
    );
  }

  if (!opts.skipFingerprint) {
    const fp = req.headers.get(FINGERPRINT_HEADER)?.trim();
    if (fp) {
      signals.fp = fp;
      checks.push(
        fetchIsFingerprintBannedEdge(fp)
          .then((b) => (b ? { banned: true, reason: "fp-banned" } : null))
          .catch(() => null),
      );
    }
  }

  if (!opts.skipDiscord) {
    const rawDid = req.cookies.get(DISCORD_ID_COOKIE)?.value;
    if (rawDid) {
      const secret = process.env.BETTER_AUTH_SECRET?.trim();
      const didPromise = verifyDiscordIdCookieValue(rawDid, secret);
      checks.push(
        didPromise
          .then(async (did) => {
            if (!did) return null;
            signals.did = did;
            const banned = await fetchIsDiscordBannedEdge(did);
            return banned ? { banned: true, reason: "discord-banned" } : null;
          })
          .catch(() => null),
      );
    }
  }

  if (checks.length === 0) return { banned: false, signals };

  const results = await Promise.all(checks);
  for (const r of results) {
    if (r?.banned) return { banned: true, reason: r.reason, signals };
  }
  return { banned: false, signals };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent");
  const trustedBot = isTrustedBotUserAgent(ua);

  /** Page bannie : pas de vérifs (sinon boucle infinie de redirect). */
  if (pathname === "/banned" || pathname.startsWith("/banned/")) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/");
  const isAuthRoute = pathname.startsWith(AUTH_API_PREFIX);
  const isOptions = req.method === "OPTIONS";
  const messengerOk = pathname === MESSENGER_PATH && messengerBearerOk(req);
  const analyticsOnly =
    pathname === ANALYTICS_COLLECT ||
    pathname.startsWith(`${ANALYTICS_COLLECT}/`);

  /** Preflight hors navigateur léger : évite de bloquer OPTIONS sans UA pertinent. */
  if (isApi && isOptions) {
    return NextResponse.next();
  }

  /**
   * 0. Whitelist ban-proof : Discord IDs définis dans
   *    `HACKONCOD_BAN_WHITELIST_DISCORD_IDS`. Court-circuit total, efface au passage
   *    le cookie SITE_BLOCKED si présent pour nettoyer un état "fantôme".
   */
  const verifiedDid = await verifiedDiscordIdFromRequest(req);
  if (verifiedDid && isDiscordIdBanWhitelisted(verifiedDid)) {
    const res = NextResponse.next();
    if (req.cookies.get(SITE_BLOCKED)?.value) {
      res.cookies.set(SITE_BLOCKED, "", { path: "/", maxAge: 0 });
    }
    return res;
  }

  /**
   * 1. Cookie marqueur : ban déjà connu côté client, court-circuit zero-DB.
   *    Le cookie n'est posé que par le middleware/back ; httpOnly empêche
   *    la suppression triviale via DevTools dans la plupart des contextes.
   */
  if (req.cookies.get(SITE_BLOCKED)?.value === "1") {
    return isApi
      ? jsonForbidden("site-blocked-cookie", false)
      : redirectToBanned(req, false);
  }

  /**
   * 2. Ban-first : IP + fingerprint (header) + Discord ID (cookie HMAC).
   *    Skip fingerprint/Discord pour bots de confiance et infra messenger
   *    (ils n'exposent ni header fingerprint ni cookie discord_id). IP checké pour tous.
   */
  const skipFpDid = trustedBot || messengerOk || isAuthRoute;
  const ban = await runBanChecks(req, {
    ip,
    skipFingerprint: skipFpDid,
    skipDiscord: skipFpDid,
  });
  if (ban.banned) {
    /**
     * Propagation : enregistre les signaux observés (IP, fingerprint, discord_id)
     * dans banned_ips / banned_fingerprints. Fire-and-forget — pas d'attente,
     * une erreur ne bloque pas la redirection.
     */
    void fetchRecordBanSignalsEdge({
      ip: ban.signals.ip,
      fp: ban.signals.fp,
      did: ban.signals.did,
      reason: ban.reason ?? "auto-propagation",
    });
    return isApi
      ? jsonForbidden(ban.reason ?? "banned", true)
      : redirectToBanned(req, true);
  }

  /** 3. Bots d'automatisation bloqués (curl, headless, scrapers connus). */
  if (!messengerOk && isBlockedAutomationUserAgent(ua)) {
    if (isApi) return jsonForbidden("bot-ua");
    return NextResponse.redirect(new URL("/banned", req.url));
  }

  /** 4. Rate-limit + VPN/proxy. Skip auth (Better Auth gère) et analytics (bursty by design). */
  const skipGlobalRl = isAuthRoute || analyticsOnly;
  if (!skipGlobalRl && ip !== "unknown" && !isLoopbackIp(ip)) {
    const sessionKey = isApi ? getSessionRateLimitKey(req) : null;
    const rl = sessionKey
      ? await edgeRateLimitAllow(sessionKey, "api-auth")
      : await edgeRateLimitAllow(ip, isApi ? "api" : "page");
    if (!rl.ok) {
      return isApi
        ? tooMany()
        : NextResponse.redirect(new URL("/banned", req.url));
    }

    /** Infra messenger / auth + bots de confiance : tolère IP type datacenter sans inspection VPN. */
    const skipVpn = messengerOk || isAuthRoute || trustedBot;
    if (!skipVpn) {
      try {
        if (await isBlockedVpnOrProxyEdge(ip)) {
          return isApi
            ? jsonForbidden("vpn-or-proxy")
            : redirectToBanned(req, true);
        }
      } catch {
        /* service VPN externe KO : pas de blocage général */
      }
    }
  }

  /** 5. API : auth Better Auth + caller fiable (Origin/Referer + Sec-Fetch). */
  if (isApi) {
    if (isAuthRoute || messengerOk) {
      return NextResponse.next();
    }
    if (!isTrustedApiCaller(req)) {
      return jsonForbidden("untrusted-caller");
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    /*
     * Pages (hors fichiers statiques gérés implicitement par Next sur certains chemins ;
     * on évite _next et assets courants).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
