import "server-only";

import { cookies, headers } from "next/headers";

/**
 * En-têtes pour `auth.api.*` (RSC / Server Actions).
 * Sur certaines requêtes Next, la chaîne `Cookie` issue de `headers()` peut être incomplète
 * alors que le store `cookies()` contient bien les jetons Better Auth.
 */
export async function getHeadersForBetterAuth(): Promise<Headers> {
  const h = new Headers(await headers());
  const store = await cookies();
  const all = store.getAll();
  if (all.length === 0) {
    return h;
  }
  h.set(
    "cookie",
    all.map((c) => `${c.name}=${c.value}`).join("; "),
  );
  return h;
}
