/**
 * Supabase client with service_role key.
 * Bypasses RLS - use ONLY server-side (API routes, Server Components).
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 *
 * Erreur « row-level security » sur insert/upsert = quasi toujours la clé **anon**
 * dans `SUPABASE_SERVICE_ROLE_KEY` (le JWT contient `"role":"anon"`).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let adminClient: SupabaseClient | undefined

function jwtRoleFromSupabaseKey(key: string): string | undefined {
  try {
    const part = key.trim().split(".")[1]
    if (!part) return undefined
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/")
    const pad = (4 - (b64.length % 4)) % 4
    const padded = b64 + (pad ? "=".repeat(pad) : "")
    const json = Buffer.from(padded, "base64").toString("utf8")
    const { role } = JSON.parse(json) as { role?: string }
    return role
  } catch {
    return undefined
  }
}

export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY missing in .env.local. " +
        "Get it from Supabase > Project Settings > API > service_role (secret)."
    )
  }

  const jwtRole = jwtRoleFromSupabaseKey(key)
  if (jwtRole === "anon" || jwtRole === "authenticated") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY : tu as mis la clé anon/authenticated. " +
        "Mets la clé **service_role** (onglet API Supabase, section « Project API keys », secret long). " +
        "La clé anon ne contourne pas le RLS → erreur sur public.users.",
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
