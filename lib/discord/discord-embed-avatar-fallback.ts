/**
 * Avatar Discord par défaut (embed) à partir du snowflake — même logique que le bot.
 * Utilisable côté client lorsque l’URL CDN n’est pas encore résolue.
 */
export function discordDefaultEmbedAvatarUrl(userId: string): string {
  try {
    const idx = Number((BigInt(userId) >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}
