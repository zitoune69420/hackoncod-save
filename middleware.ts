import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { fetchIsIpBannedEdge } from "@/lib/banned/edge-ip-ban";
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

function getClientIp(req: NextRequest): string {
  return getClientIpFromHeaders(req.headers);
}

/** Loopback : présent uniquement en dev local, jamais derrière un reverse proxy en prod. */
function isLoopbackIp(ip: string): boolean {
  return ip === "::1" || ip === "127.0.0.1" || ip.startsWith("127.");
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

function jsonForbidden(reason?: string) {
  const res = NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (reason) res.headers.set("x-mw-block", reason);
  return res;
}

function tooMany() {
  return NextResponse.json(
    { error: "Too Many Requests" },
    { status: 429, headers: { "Retry-After": "60" } },
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent");
  const trustedBot = isTrustedBotUserAgent(ua);

  if (pathname === "/banned" || pathname.startsWith("/banned/")) {
    return NextResponse.next();
  }

  if (req.cookies.get(SITE_BLOCKED)?.value === "1") {
    return redirectToBanned(req, false);
  }

  const isApi = pathname.startsWith("/api/");
  const messengerOk = pathname === MESSENGER_PATH && messengerBearerOk(req);
  const isAuthRoute = pathname.startsWith(AUTH_API_PREFIX);
  const isOptions = req.method === "OPTIONS";
  const analyticsOnly =
    pathname === ANALYTICS_COLLECT ||
    pathname.startsWith(`${ANALYTICS_COLLECT}/`);

  /** Preflight hors navigateur léger : évite de bloquer OPTIONS sans UA pertinent. */
  if (isApi && isOptions) {
    return NextResponse.next();
  }

  if (!messengerOk) {
    if (isBlockedAutomationUserAgent(ua)) {
      if (isApi) return jsonForbidden("bot-ua");
      return NextResponse.redirect(new URL("/banned", req.url));
    }
  }

  const skipGlobalRl = isAuthRoute || analyticsOnly;

  if (!skipGlobalRl) {
    if (ip !== "unknown" && !isLoopbackIp(ip)) {
      const rl = await edgeRateLimitAllow(ip, isApi ? "api" : "page");
      if (!rl.ok) {
        return isApi ? tooMany() : NextResponse.redirect(new URL("/banned", req.url));
      }

      /** Infra messenger / auth + bots de confiance : tolère IP type datacenter sans inspection VPN. */
      const skipVpn = messengerOk || isAuthRoute || trustedBot;

      if (!skipVpn) {
        try {
          if (await isBlockedVpnOrProxyEdge(ip)) {
            return isApi ? jsonForbidden("vpn-or-proxy") : redirectToBanned(req, true);
          }
        } catch {
          /* service VPN externe KO : pas de blocage général */
        }
      }
    }
  }

  if (isApi) {
    if (isAuthRoute) {
      return NextResponse.next();
    }

    if (ip !== "unknown" && !isLoopbackIp(ip)) {
      try {
        if (await fetchIsIpBannedEdge(ip)) {
          return jsonForbidden("ip-banned");
        }
      } catch {
        /* ne pas fermer si Supabase indispo */
      }
    }

    if (messengerOk) {
      return NextResponse.next();
    }

    if (!isTrustedApiCaller(req)) {
      return jsonForbidden("untrusted-caller");
    }

    return NextResponse.next();
  }

  if (ip !== "unknown" && !isLoopbackIp(ip)) {
    try {
      if (await fetchIsIpBannedEdge(ip)) {
        return redirectToBanned(req, true);
      }
    } catch {
      /* ne pas fermer si Supabase indispo */
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
