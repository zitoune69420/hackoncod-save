import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_API_PREFIX = "/api/auth";

/**
 * Limite l’appel des routes `/api/*` aux navigations de confiance (même origine / internes),
 * sans logique lourde (uniquement en-têtes Fetch Metadata + Origin / Referer).
 * Les requêtes RSC/server vers l’API (sans Sec-Fetch-*) restent autorisées si ni Origin ni referer hostile.
 */
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

  // Pas d’Origin / Referer (ex. fetch serveur Node vers cette API, curl, outils)
  return true;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

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

export const config = {
  matcher: "/api/:path*",
};
