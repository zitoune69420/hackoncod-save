/**
 * Cookie signé HMAC pour exposer le Discord snowflake au middleware Edge
 * sans round-trip serveur ni risque de forge côté client.
 *
 * Format : `<snowflake>.<base64url(HMAC-SHA256(snowflake, BETTER_AUTH_SECRET))>`
 *
 * Posé par le hook `after` Better Auth après un OAuth Discord réussi
 * (cf. app/auth.ts), vérifié par le middleware Edge avant tout RPC ban.
 */

export const DISCORD_ID_COOKIE = "hackoncod_did";
export const DISCORD_ID_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours
const DISCORD_SNOWFLAKE_RE = /^\d{5,24}$/;

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  const b64 = typeof btoa === "function" ? btoa(s) : Buffer.from(s, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64u: string): Uint8Array | null {
  try {
    let b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad === 2) b64 += "==";
    else if (pad === 3) b64 += "=";
    else if (pad === 1) return null;
    const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Signe un snowflake Discord avec `BETTER_AUTH_SECRET`. Retourne la valeur prête pour `Set-Cookie`. */
export async function signDiscordIdCookieValue(
  discordId: string,
  secret: string,
): Promise<string | null> {
  const did = discordId.trim();
  if (!DISCORD_SNOWFLAKE_RE.test(did) || !secret) return null;
  const key = await importKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(did)),
  );
  return `${did}.${bytesToBase64Url(sig)}`;
}

/**
 * Vérifie un cookie signé et retourne le snowflake en clair si valide, sinon null.
 * Tolérant aux valeurs absentes ; **ne logge rien** (peut être appelé par toutes les requêtes).
 */
export async function verifyDiscordIdCookieValue(
  raw: string | undefined | null,
  secret: string | undefined | null,
): Promise<string | null> {
  if (!raw || !secret) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;
  const did = raw.slice(0, dot);
  const sigB64 = raw.slice(dot + 1);
  if (!DISCORD_SNOWFLAKE_RE.test(did)) return null;
  const sig = base64UrlToBytes(sigB64);
  if (!sig) return null;
  try {
    const key = await importKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sig as BufferSource,
      encoder.encode(did),
    );
    return ok ? did : null;
  } catch {
    return null;
  }
}
