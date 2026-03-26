import { NextRequest, NextResponse } from "next/server";
import {
  countryFromRequestHeaders,
  hostFromReferrer,
  hostnameFromUrl,
  parseUserAgent,
  utmFromUrl,
} from "@/lib/analytics/parse-request";
import { insertAnalyticsPageView } from "@/lib/supabase/analytics";

export const runtime = "nodejs";

const MAX_BODY = 12_000;

function shouldSkipPath(pathname: string): boolean {
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return true;
  }
  return /\.(ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot|map)$/i.test(
    pathname,
  );
}

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_ANALYTICS_DISABLED === "1") {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) {
      return NextResponse.json({ error: "Payload too large" }, { status: 400 });
    }
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const path = typeof b.path === "string" ? b.path.trim() : "";
  const href = typeof b.href === "string" ? b.href.trim() : "";
  const visitor_id = typeof b.visitorId === "string" ? b.visitorId.trim() : "";
  const session_id =
    typeof b.sessionId === "string" ? b.sessionId.trim() : "";
  const referrer =
    typeof b.referrer === "string" ? b.referrer.trim().slice(0, 2000) : null;

  if (!path || !visitor_id || !session_id) {
    return NextResponse.json(
      { error: "path, visitorId, sessionId required" },
      { status: 400 },
    );
  }

  if (!path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  if (shouldSkipPath(path.split("?")[0] ?? path)) {
    return new NextResponse(null, { status: 204 });
  }

  const ua = req.headers.get("user-agent");
  const { device_type, browser, os } = parseUserAgent(ua);
  const country_code = countryFromRequestHeaders(req.headers);
  const referrer_host =
    hostFromReferrer(referrer) ??
    hostFromReferrer(req.headers.get("referer")) ??
    null;

  const effectiveHref = href || `${req.nextUrl.origin}${path}`;
  const hostname = hostnameFromUrl(effectiveHref);
  const utm = utmFromUrl(effectiveHref);

  const res = await insertAnalyticsPageView({
    path: path.split("?")[0] || path,
    hostname,
    referrer: referrer ?? req.headers.get("referer"),
    referrer_host,
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    country_code,
    device_type,
    browser,
    os,
    visitor_id,
    session_id,
  });

  if (!res.ok) {
    /* Table absente en dev : ne pas casser le navigateur */
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
