import { getClientIpFromHeaders } from "@/lib/banned/client-ip";
import { recordCheatDownloadEvent } from "@/lib/supabase/download-events";
import {
  countryFromRequestHeaders,
  parseUserAgent,
} from "@/lib/analytics/parse-request";
import { resolveCheatDownloadUrl } from "@/lib/cheat-download-server";
import { getCheatLinkFlagsById } from "@/lib/supabase/queries";
import { isUuid } from "@/lib/security/is-uuid";
import { verifyPublicDownloadPayload } from "@/lib/public-download-token";
import { getCheatDownloadSigningSecret } from "@/lib/env";
import {
  allowPublicDownloadApiGet,
  allowPublicDownloadForCheat,
} from "@/lib/security/public-download-rate-limit";
import { NextResponse } from "next/server";

const SIGNED_URL_SECONDS = 180;

export async function GET(req: Request) {
  const ip = getClientIpFromHeaders(req.headers);
  if (!allowPublicDownloadApiGet(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { searchParams } = new URL(req.url);
  const cheatId = searchParams.get("cheatId")?.trim() ?? "";
  const expRaw = searchParams.get("exp")?.trim() ?? "";
  const sig = searchParams.get("sig")?.trim() ?? "";

  if (!cheatId || !isUuid(cheatId)) {
    return NextResponse.json({ error: "Invalid cheatId" }, { status: 400 });
  }

  if (!getCheatDownloadSigningSecret()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const exp = Number.parseInt(expRaw, 10);
  if (!Number.isFinite(exp) || !sig || !verifyPublicDownloadPayload(cheatId, exp, sig)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!allowPublicDownloadForCheat(ip, cheatId)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const row = await getCheatLinkFlagsById(cheatId);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.vip || row.semi_vip) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolved = await resolveCheatDownloadUrl(row.link, SIGNED_URL_SECONDS);
  if ("error" in resolved) {
    const status = resolved.status ?? 500;
    const safeError =
      process.env.NODE_ENV === "production" && status >= 500
        ? "Request failed"
        : resolved.error;
    return NextResponse.json({ error: safeError }, { status });
  }

  const { device_type } = parseUserAgent(req.headers.get("user-agent"));
  await recordCheatDownloadEvent({
    cheatId,
    channel: "public",
    countryCode: countryFromRequestHeaders(req.headers),
    deviceType: device_type,
  });

  return NextResponse.json({
    url: resolved.url,
    external: Boolean(resolved.external),
    expiresIn: resolved.external ? undefined : SIGNED_URL_SECONDS,
  });
}
