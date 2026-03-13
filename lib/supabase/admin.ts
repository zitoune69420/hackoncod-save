/**
 * Client Supabase avec la clé service_role.
 * Contourne RLS - à utiliser UNIQUEMENT côté serveur (API routes, Server Components).
 * Ne jamais exposer SUPABASE_SERVICE_ROLE_KEY au client.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let adminClient: SupabaseClient | undefined

export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local. " +
        "Récupère-le dans Supabase > Project Settings > API > service_role (secret)."
    )
  }

  adminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return adminClient
}
