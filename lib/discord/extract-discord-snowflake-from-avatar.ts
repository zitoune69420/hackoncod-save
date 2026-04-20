/**
 * Extrait le snowflake Discord depuis une URL d’avatar CDN (OAuth Discord).
 */
export function extractDiscordSnowflakeFromAvatarUrl(
  image: string | null | undefined,
): string | null {
  if (!image?.trim()) return null;
  const match = image.match(/cdn\.discordapp\.com\/avatars\/(\d+)\//i);
  const raw = match?.[1]?.trim() ?? "";
  if (!/^\d{5,24}$/.test(raw)) return null;
  return raw;
}
