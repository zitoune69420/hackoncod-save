/**
 * IP client pour journalisation / banned_ips.
 * Priorité aux en-têtes posés par l’infra (non falsifiables depuis le navigateur),
 * puis repli sur XFF (dernier hop = client souvent ajouté en dernier par la chaîne de proxies).
 */
export function getClientIpFromHeaders(headers: Headers): string {
  const pick = (v: string | null | undefined) => v?.trim() ?? "";

  const cf = pick(headers.get("cf-connecting-ip"));
  if (cf) return cf;

  const vercelFf = pick(headers.get("x-vercel-forwarded-for"));
  if (vercelFf) {
    const first = vercelFf.split(",")[0]?.trim();
    if (first) return first;
  }

  const trueClient = pick(headers.get("true-client-ip"));
  if (trueClient) return trueClient;

  const realIp = pick(headers.get("x-real-ip"));
  if (realIp) return realIp;

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length > 0) {
      // Premier hop = IP client originale ajoutée par le premier proxy de confiance
      return parts[0]!;
    }
  }

  return "unknown";
}
