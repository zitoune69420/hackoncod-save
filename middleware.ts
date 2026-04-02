import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchIsIpBannedEdge } from "@/lib/banned/edge-ip-ban";

const AUTH_API_PREFIX = "/api/auth";
const SITE_BLOCKED = "hackoncod_site_blocked";

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

function isTrustedApiCaller(req: NextRequest): boolean {
  const host = req.nextUrl.hostname;

  const sfs = req.headers.get("sec-fetch-site");
  if (sfs === "same-origin" || sfs === "same-site") {
    return true;
  }

  if (sfs === "cross-site") {
    return false;
  }

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).hostname === host) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).hostname === host) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  return true;
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
      httpOnly: false,
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
