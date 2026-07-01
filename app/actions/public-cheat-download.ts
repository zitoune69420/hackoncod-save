"use server";

import { headers } from "next/headers";
import { getClientIpFromHeaders } from "@/lib/banned/client-ip";
import { getCheatLinkFlagsById } from "@/lib/supabase/queries";
import { isUuid } from "@/lib/security/is-uuid";
import { getCheatDownloadSigningSecret } from "@/lib/env";
import { signPublicDownloadPayload } from "@/lib/public-download-token";
import { allowPublicDownloadTokenIssue } from "@/lib/security/public-download-rate-limit";

const TOKEN_TTL_SEC = 300;

export type PublicCheatDownloadTokenResult =
  | { ok: true; exp: number; sig: string }
  | {
      ok: false;
      error:
        | "invalid"
        | "not_found"
        | "forbidden"
        | "no_file"
        | "misconfigured"
        | "rate_limited";
    };

export async function issuePublicCheatDownloadToken(
  cheatId: string,
): Promise<PublicCheatDownloadTokenResult> {
  if (!getCheatDownloadSigningSecret()) {
    return { ok: false, error: "misconfigured" };
  }

  const ip = getClientIpFromHeaders(await headers());
  if (!allowPublicDownloadTokenIssue(ip)) {
    return { ok: false, error: "rate_limited" };
  }

  const id = cheatId.trim();
  if (!isUuid(id)) {
    return { ok: false, error: "invalid" };
  }

  const row = await getCheatLinkFlagsById(id);
  if (!row) {
    return { ok: false, error: "not_found" };
  }
  if (row.vip || row.semi_vip) {
    return { ok: false, error: "forbidden" };
  }
  const link = String(row.link ?? "").trim();
  if (!link) {
    return { ok: false, error: "no_file" };
  }

  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const sig = signPublicDownloadPayload(id, exp);
  if (!sig) {
    return { ok: false, error: "misconfigured" };
  }

  return { ok: true, exp, sig };
}
