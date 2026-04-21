"use server";

import { getCheatLinkFlagsById } from "@/lib/supabase/queries";
import { isUuid } from "@/lib/security/is-uuid";
import { getPublicDownloadHmacSecret } from "@/lib/env";
import { signPublicDownloadPayload } from "@/lib/public-download-token";

const TOKEN_TTL_SEC = 300;

export type PublicCheatDownloadTokenResult =
  | { ok: true; exp: number; sig: string }
  | { ok: false; error: "invalid" | "not_found" | "forbidden" | "no_file" | "misconfigured" };

export async function issuePublicCheatDownloadToken(
  cheatId: string,
): Promise<PublicCheatDownloadTokenResult> {
  if (!getPublicDownloadHmacSecret()) {
    return { ok: false, error: "misconfigured" };
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
