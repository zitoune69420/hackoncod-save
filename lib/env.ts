import "server-only";

/**
 * Accès centralisé aux secrets serveur. L'import `server-only` force
 * l'erreur de build dès qu'un Client Component tente d'importer ce module,
 * garantissant que ces valeurs ne fuient jamais dans un bundle navigateur.
 *
 * Les accesseurs retournent la valeur brute (pas de `.trim()`) : chaque
 * appelant conserve la logique de normalisation locale existante.
 */

export function getDiscordBotToken(): string | undefined {
  return process.env.DISCORD_BOT_TOKEN;
}

export function getDiscordClientSecret(): string | undefined {
  return process.env.DISCORD_CLIENT_SECRET;
}

export function getBetterAuthSecret(): string | undefined {
  return process.env.BETTER_AUTH_SECRET;
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Clé publishable / anon (déjà exposée au navigateur via NEXT_PUBLIC_*).
 * Utilisation typique : RPC Edge (`is_ip_banned`) sans service_role.
 */
export function getSupabasePublishableKey(): string | undefined {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return k || undefined;
}

/** URL projet Supabase (sans slash final). */
export function getSupabaseProjectUrl(): string | undefined {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  return u || undefined;
}

/**
 * HMAC pour `/api/cheats/public-download` (jeton court via Server Action).
 * Dédié ou repli sur BETTER_AUTH_SECRET pour éviter une variable supplémentaire.
 */
export function getPublicDownloadHmacSecret(): string | undefined {
  const d = process.env.PUBLIC_CHEAT_DOWNLOAD_SECRET?.trim();
  if (d) return d;
  return getBetterAuthSecret();
}
