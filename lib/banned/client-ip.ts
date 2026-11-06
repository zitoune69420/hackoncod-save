/**
 * IP client pour journalisation / banned_ips.
 * Uniquement les en-têtes que Vercel écrase lui-même (non falsifiables depuis le navigateur).
 * shortcut: `cf-connecting-ip` / `true-client-ip` ignorés car le site n'est pas derrière Cloudflare
 * (le client pourrait les forger) ; à réactiver seulement si Cloudflare proxifie l'origine.
 */
export function getClientIpFromHeaders(headers: Headers): string {
  const pick = (v: string | null | undefined) => v?.trim() ?? "";

  const vercelFf = pick(headers.get("x-vercel-forwarded-for"));
  if (vercelFf) {
    const first = vercelFf.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = pick(headers.get("x-real-ip"));
  if (realIp) return realIp;

  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "unknown";
}
