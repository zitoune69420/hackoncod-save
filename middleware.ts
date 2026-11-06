import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

import { isDiscordIdBanWhitelisted } from "@/lib/auth/ban-whitelist";
import {
  DISCORD_ID_COOKIE,
  verifyDiscordIdCookieValue,
} from "@/lib/auth/discord-id-cookie";
import {
  BAN_MARKER_COOKIE,
  BAN_MARKER_MAX_AGE,
  signBanMarker,
  verifyBanMarker,
  type BanSignals,
} from "@/lib/banned/ban-marker-cookie";
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
  return verifyDiscordIdCookieValue(raw, cookieSecret());
}

function cookieSecret(): string | undefined {
  return process.env.BETTER_AUTH_SECRET?.trim() || undefined;
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

function withBanMarker(res: NextResponse, marker: string | null) {
  if (marker) {
    res.cookies.set(BAN_MARKER_COOKIE, marker, {
      path: "/",
      maxAge: BAN_MARKER_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}

function redirectToBanned(req: NextRequest, marker: string | null = null) {
  const url = req.nextUrl.clone();
  url.pathname = "/banned";
  url.search = "";
  return withBanMarker(NextResponse.redirect(url), marker);
}

function jsonForbidden(reason?: string, marker: string | null = null) {
  const res = NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (reason) res.headers.set("x-mw-block", reason);
  return withBanMarker(res, marker);
}

function tooMany(isApi: boolean) {
  const init = { status: 429, headers: { "Retry-After": "60" } };
  return isApi
    ? NextResponse.json({ error: "Too Many Requests" }, init)
    : new NextResponse("Too Many Requests", init);
}

/**
 * Vérifications ban (IP, fingerprint, Discord) en parallèle. Fail-open par source :
 * Supabase indisponible ne ferme pas le site.
 */
async function findBanReason(s: BanSignals): Promise<string | null> {
  const check = (p: Promise<boolean>, reason: string) =>
    p.then((b) => (b ? reason : null)).catch(() => null);
  const results = await Promise.all([
    s.ip ? check(fetchIsIpBannedEdge(s.ip), "ip-banned") : null,
    s.fp ? check(fetchIsFingerprintBannedEdge(s.fp), "fp-banned") : null,
    s.did ? check(fetchIsDiscordBannedEdge(s.did), "discord-banned") : null,
  ]);
  return results.find((r) => r != null) ?? null;
}

type GuardContext = {
  ip: string;
  ua: string | null;
  trustedBot: boolean;
  isApi: boolean;
  isAuthRoute: boolean;
  messengerOk: boolean;
  analyticsOnly: boolean;
};

/** Étapes hors ban : bots, rate-limit, VPN, origine des appels API. */
async function guardRequest(
  req: NextRequest,
  c: GuardContext,
): Promise<NextResponse> {
  /** 3. Bots d'automatisation bloqués (curl, headless, scrapers connus). */
  if (!c.messengerOk && isBlockedAutomationUserAgent(c.ua)) {
    if (c.isApi) return jsonForbidden("bot-ua");
    return redirectToBanned(req);
  }

  /** 4. Rate-limit + VPN/proxy. Skip auth (Better Auth gère) et analytics (bursty by design). */
  const skipGlobalRl = c.isAuthRoute || c.analyticsOnly;
  if (!skipGlobalRl && c.ip !== "unknown" && !isLoopbackIp(c.ip)) {
    const sessionKey = c.isApi ? getSessionRateLimitKey(req) : null;
    /** Navigations client / prefetch (`RSC: 1`) : quota API, sinon le quota page (25/min) saute en quelques clics. */
    const isRsc = req.headers.get("rsc") === "1";
    const rl = sessionKey
      ? await edgeRateLimitAllow(sessionKey, "api-auth")
      : await edgeRateLimitAllow(c.ip, c.isApi || isRsc ? "api" : "page");
    if (!rl.ok) return tooMany(c.isApi);

    /** Infra messenger / auth + bots de confiance : tolère IP type datacenter sans inspection VPN. */
    const skipVpn = c.messengerOk || c.isAuthRoute || c.trustedBot;
    if (!skipVpn) {
      try {
        if (await isBlockedVpnOrProxyEdge(c.ip)) {
          /** Pas de marqueur : un VPN n'est pas un ban, couper le VPN doit suffire. */
          return c.isApi ? jsonForbidden("vpn-or-proxy") : redirectToBanned(req);
        }
      } catch {
        /* service VPN externe KO : pas de blocage général */
      }
    }
  }

  /** 5. API : auth Better Auth + caller fiable (Origin/Referer + Sec-Fetch). */
  if (c.isApi && !c.isAuthRoute && !c.messengerOk && !isTrustedApiCaller(req)) {
    return jsonForbidden("untrusted-caller");
  }

  return NextResponse.next();
}

export async function middleware(req: NextRequest, event: NextFetchEvent) {
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

  const hasMarker = Boolean(req.cookies.get(BAN_MARKER_COOKIE)?.value);
  const clearMarker = (res: NextResponse) => {
    if (hasMarker) res.cookies.set(BAN_MARKER_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  /**
   * 0. Whitelist ban-proof : Discord IDs définis dans
   *    `HACKONCOD_BAN_WHITELIST_DISCORD_IDS`. Court-circuit total, efface au passage
   *    le marqueur de ban si présent pour nettoyer un état "fantôme".
   */
  const verifiedDid = await verifiedDiscordIdFromRequest(req);
  if (verifiedDid && isDiscordIdBanWhitelisted(verifiedDid)) {
    return clearMarker(NextResponse.next());
  }

  /**
   * 1-2. Ban : signaux de la requête (IP, fingerprint header, Discord ID du cookie HMAC)
   *      + signaux du marqueur signé posé lors d'un ban précédent. Le marqueur garde
   *      le blocage après un changement d'IP, et tombe dès que l'admin débannit.
   *      Fingerprint/Discord ignorés pour bots de confiance, messenger et routes auth.
   */
  const skipFpDid = trustedBot || messengerOk || isAuthRoute;
  const current: BanSignals = {
    ip: ip !== "unknown" && !isLoopbackIp(ip) ? ip : null,
    fp: skipFpDid ? null : req.headers.get(FINGERPRINT_HEADER)?.trim() || null,
    did: skipFpDid ? null : verifiedDid,
  };
  const secret = cookieSecret();
  const marked = hasMarker
    ? await verifyBanMarker(req.cookies.get(BAN_MARKER_COOKIE)?.value, secret)
    : null;
  const [currentReason, markedReason] = await Promise.all([
    findBanReason(current),
    marked ? findBanReason(marked) : null,
  ]);
  const reason = currentReason ?? markedReason;

  if (reason) {
    /**
     * Propagation des nouveaux signaux (IP, fingerprint) seulement si l'identité Discord
     * bannie est prouvée (cookie HMAC ou marqueur signé). Une IP ou une empreinte seules
     * peuvent être partagées (4G, box, école) : les propager bannirait des innocents en cascade.
     */
    const provenDid =
      currentReason === "discord-banned"
        ? current.did
        : markedReason === "discord-banned"
          ? marked?.did ?? null
          : null;
    if (provenDid) {
      event.waitUntil(
        fetchRecordBanSignalsEdge({
          ip: current.ip,
          fp: current.fp,
          did: provenDid,
          reason: "auto-propagation",
        }),
      );
    }
    const marker = secret ? await signBanMarker(marked ?? current, secret) : null;
    return isApi ? jsonForbidden(reason, marker) : redirectToBanned(req, marker);
  }

  const res = await guardRequest(req, {
    ip,
    ua,
    trustedBot,
    isApi,
    isAuthRoute,
    messengerOk,
    analyticsOnly,
  });
  return clearMarker(res);
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
