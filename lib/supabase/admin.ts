/**
 * Supabase client with service_role key.
 * Bypasses RLS - use ONLY server-side (API routes, Server Components).
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let adminClient: SupabaseClient | undefined

export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY missing in .env.local. " +
        "Get it from Supabase > Project Settings > API > service_role (secret)."
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
