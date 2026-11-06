import "server-only";

import { auth } from "@/app/auth";
import { getHeadersForBetterAuth } from "@/lib/auth/get-headers-for-better-auth";

type AuthGetSessionResult = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

/** Origines de confiance (env uniquement) : jamais un host fourni par la requête. */
function trustedAuthOrigins(): string[] {
  const raw = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];
  const out: string[] = [];
  for (const r of raw) {
    try {
      if (r?.trim()) out.push(new URL(r.trim()).origin);
    } catch {
      /* ignore invalid URL */
    }
  }
  return out;
}

/**
 * La réponse de ce fetch est acceptée comme session : l'origine doit être la nôtre.
 * Un `Host` / `X-Forwarded-Host` arbitraire permettait de renvoyer une session forgée.
 */
function resolveAuthOrigin(h: Headers): string | null {
  const trusted = trustedAuthOrigins();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    (process.env.VERCEL ? "https" : "http");
  if (host) {
    const fromRequest = `${proto}://${host}`;
    if (trusted.includes(fromRequest)) return fromRequest;
  }
  return trusted[0] ?? null;
}

/**
 * Session Better Auth côté serveur : `getSession` direct, puis repli HTTP sur `/api/auth/get-session`
 * (même chemin que le navigateur — utile si l’appel direct échoue depuis une Server Action).
 */
export async function getServerAuthSession(): Promise<AuthGetSessionResult | null> {
  const headers = await getHeadersForBetterAuth();
  const direct = await auth.api.getSession({ headers });
  if (direct?.user?.id) {
    return direct;
  }

  const origin = resolveAuthOrigin(headers);
  const cookie = headers.get("cookie") ?? "";
  if (!origin || !cookie) {
    return null;
  }

  const url = `${origin}/api/auth/get-session`;
  try {
    const res = await fetch(url, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as AuthGetSessionResult | null;
    if (!data?.user?.id) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
