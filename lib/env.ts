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
