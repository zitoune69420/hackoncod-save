import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchIsIpBannedEdge } from "@/lib/banned/edge-ip-ban";
import { getClientIpFromHeaders } from "@/lib/banned/client-ip";
import { timingSafeEqualUtf8 } from "@/lib/security/timing-safe-utf8";

const AUTH_API_PREFIX = "/api/auth";
const MESSENGER_PATH = "/api/messenger";
const SITE_BLOCKED = "hackoncod_site_blocked";

function getClientIp(req: NextRequest): string {
  return getClientIpFromHeaders(req.headers);
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
 * Filtre les appels API : métadonnées Fetch (navigateur) + origine ou referer autorisé.
 * Sans Sec-Fetch-Site same-origin/same-site → refus (curl/scripts par défaut).
 * Remarque : un attaquant peut forger ces en-têtes ; chaque route doit toujours valider auth / données.
 */
function isTrustedApiCaller(req: NextRequest): boolean {
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/banned" || pathname.startsWith("/banned/")) {
    return NextResponse.next();
  }

  if (req.cookies.get(SITE_BLOCKED)?.value === "1") {
    return redirectToBanned(req, false);
  }

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith(AUTH_API_PREFIX)) {
      return NextResponse.next();
    }
    if (req.method === "OPTIONS") {
      return NextResponse.next();
    }
    if (pathname === MESSENGER_PATH && messengerBearerOk(req)) {
      return NextResponse.next();
    }
    if (!isTrustedApiCaller(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  const ip = getClientIp(req);
  if (ip !== "unknown") {
    try {
      if (await fetchIsIpBannedEdge(ip)) {
        return redirectToBanned(req, true);
      }
    } catch {
      /* ne pas bloquer le site si Supabase indisponible */
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
