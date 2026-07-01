/**
 * Empreinte client stable utilisée pour bloquer les utilisateurs récidivistes
 * malgré changement d'IP ou de compte. Volontairement légère : pas de bibliothèque
 * externe, signaux non personnellement identifiants pris seuls.
 *
 * Signaux : UA, langue, timezone, dimensions/profondeur écran, hardwareConcurrency,
 * plateforme, hash canvas (2d, texte + couleur). SHA-256 puis hex.
 *
 * Stocké en localStorage (`hackoncod_fp`) pour rester stable d'une session à l'autre
 * et éviter de re-payer le rendu canvas à chaque navigation.
 */

const LS_KEY = "hackoncod_fp";
const FP_HEADER = "X-Client-Fingerprint";

let inFlight: Promise<string | null> | null = null;

function safeGetLs(): string | null {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v && /^[a-f0-9]{32,128}$/i.test(v) ? v : null;
  } catch {
    return null;
  }
}

function safeSetLs(v: string): void {
  try {
    localStorage.setItem(LS_KEY, v);
  } catch {
    /* quotas / mode privé */
  }
}

function canvasHashSignal(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("hackoncod-fp-1", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("hackoncod-fp-1", 4, 17);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

function collectSignals(): string {
  const nav = typeof navigator !== "undefined" ? navigator : ({} as Navigator);
  const scr = typeof screen !== "undefined" ? screen : ({} as Screen);
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    /* ignore */
  }
  const parts = [
    nav.userAgent ?? "",
    (nav.language ?? "") + "|" + ((nav.languages ?? []).join(",") || ""),
    tz,
    `${scr.width ?? 0}x${scr.height ?? 0}x${scr.colorDepth ?? 0}`,
    String(nav.hardwareConcurrency ?? 0),
    nav.platform ?? "",
    canvasHashSignal(),
  ];
  return parts.join("||");
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  const arr = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < arr.length; i++) {
    out += arr[i]!.toString(16).padStart(2, "0");
  }
  return out;
}

/** Calcule l'empreinte (cache localStorage). Renvoie null si Web Crypto indispo. */
export async function getClientFingerprint(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const cached = safeGetLs();
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      if (!crypto?.subtle) return null;
      const hash = await sha256Hex(collectSignals());
      safeSetLs(hash);
      return hash;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function isSameOriginUrl(target: string): boolean {
  try {
    const u = new URL(target, window.location.href);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

function hasHeader(init: RequestInit | undefined, name: string): boolean {
  const lname = name.toLowerCase();
  const h = init?.headers;
  if (!h) return false;
  if (h instanceof Headers) return h.has(name);
  if (Array.isArray(h)) return h.some((p) => p[0]?.toLowerCase() === lname);
  if (typeof h === "object") {
    for (const k of Object.keys(h)) if (k.toLowerCase() === lname) return true;
  }
  return false;
}

function withHeader(
  init: RequestInit | undefined,
  name: string,
  value: string,
): RequestInit {
  const next: RequestInit = { ...(init ?? {}) };
  const existing = init?.headers;
  if (existing instanceof Headers) {
    const h = new Headers(existing);
    h.set(name, value);
    next.headers = h;
  } else if (Array.isArray(existing)) {
    next.headers = [...existing, [name, value]];
  } else if (existing && typeof existing === "object") {
    next.headers = { ...(existing as Record<string, string>), [name]: value };
  } else {
    next.headers = { [name]: value };
  }
  return next;
}

let installed = false;

/**
 * Patche `window.fetch` une seule fois pour injecter `X-Client-Fingerprint`
 * sur les requêtes same-origin (les cross-origin pourraient échouer en preflight CORS).
 * Idempotent : second appel = no-op.
 */
export function installFingerprintFetch(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const orig = window.fetch.bind(window);
  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    try {
      const urlStr =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (!isSameOriginUrl(urlStr)) return orig(input, init);
      if (hasHeader(init, FP_HEADER)) return orig(input, init);
      // Request objet : éviter de muter, déléguer sans header (cas rare ; les fetches
      // app passent init = RequestInit, donc largement couvert).
      if (input instanceof Request) return orig(input, init);

      const fp = await getClientFingerprint();
      if (!fp) return orig(input, init);
      return orig(input, withHeader(init, FP_HEADER, fp));
    } catch {
      return orig(input, init);
    }
  };
}
