import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { getCheatDownloadSigningSecret } from "@/lib/env";

const MAX_SKEW_SEC = 600;

export function signPublicDownloadPayload(cheatId: string, exp: number): string {
  const secret = getCheatDownloadSigningSecret();
  if (!secret) return "";
  return createHmac("sha256", secret)
    .update(`${cheatId}|${exp}`)
    .digest("hex");
}

export function verifyPublicDownloadPayload(
  cheatId: string,
  exp: number,
  sigHex: string,
): boolean {
  const secret = getCheatDownloadSigningSecret();
  if (!secret) return false;
  const now = Math.floor(Date.now() / 1000);
  if (exp < now || exp > now + MAX_SKEW_SEC) return false;

  const expected = createHmac("sha256", secret)
    .update(`${cheatId}|${exp}`)
    .digest("hex");

  try {
    const a = Buffer.from(sigHex, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
