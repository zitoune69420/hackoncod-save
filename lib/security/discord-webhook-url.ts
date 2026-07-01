/**
 * Autorise uniquement les URLs d’exécution de webhook Discord officielles
 * (mitigation SSRF lorsqu’une URL est fournie par l’appelant).
 */
export function isAllowedDiscordWebhookUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  const allowed = new Set([
    "discord.com",
    "canary.discord.com",
    "ptb.discord.com",
    "discordapp.com",
  ]);
  if (!allowed.has(host)) return false;

  return (
    url.pathname.startsWith("/api/webhooks/") &&
    !url.pathname.includes("..")
  );
}
