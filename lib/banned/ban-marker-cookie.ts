import { signHmacToken, verifyHmacToken } from "@/lib/auth/discord-id-cookie";

/**
 * Cookie posé par le middleware quand un ban est détecté. Signé (HMAC `BETTER_AUTH_SECRET`)
 * et porteur des signaux observés au moment du ban : le middleware les revérifie en base,
 * donc le blocage survit à un changement d'IP mais tombe dès que l'admin débannit.
 */
export const BAN_MARKER_COOKIE = "hackoncod_site_blocked";
export const BAN_MARKER_MAX_AGE = 60 * 60 * 24 * 7;

export type BanSignals = {
  ip: string | null;
  fp: string | null;
  did: string | null;
};

/** Même charset que `record_ban_signals` : garantit aussi un payload ASCII pour btoa. */
const FP_RE = /^[A-Za-z0-9._:\-+/=]{1,256}$/;
const IP_RE = /^[0-9A-Fa-f.:]{2,45}$/;
const DID_RE = /^\d{5,24}$/;

function toBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
}

function clean(v: unknown, re: RegExp): string | null {
  return typeof v === "string" && re.test(v) ? v : null;
}

export async function signBanMarker(
  signals: BanSignals,
  secret: string,
): Promise<string> {
  const payload = {
    ip: clean(signals.ip, IP_RE),
    fp: clean(signals.fp, FP_RE),
    did: clean(signals.did, DID_RE),
  };
  return signHmacToken(toBase64Url(JSON.stringify(payload)), secret);
}

/** Signaux du marqueur, ou null si absent / forgé / ancien format (`"1"`). */
export async function verifyBanMarker(
  raw: string | undefined | null,
  secret: string | undefined | null,
): Promise<BanSignals | null> {
  const payload = await verifyHmacToken(raw, secret);
  if (!payload) return null;
  try {
    const o = JSON.parse(fromBase64Url(payload)) as Record<string, unknown>;
    return {
      ip: clean(o.ip, IP_RE),
      fp: clean(o.fp, FP_RE),
      did: clean(o.did, DID_RE),
    };
  } catch {
    return null;
  }
}
