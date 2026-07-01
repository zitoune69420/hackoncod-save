import "server-only";

import { auth } from "@/app/auth";
import { getHeadersForBetterAuth } from "@/lib/auth/get-headers-for-better-auth";

type AuthGetSessionResult = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

function resolveAuthOrigin(h: Headers): string | null {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    (process.env.VERCEL ? "https" : "http");
  if (host) {
    return `${proto}://${host}`;
  }
  const base =
    process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return base ?? null;
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
