/**
 * Supabase client with service_role key (JWT legacy ou clé secrète `sb_secret_`).
 * Bypasses RLS — use ONLY server-side (API routes, Server Components).
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 *
 * Erreur RLS sur `public.users` en prod : presque toujours une mauvaise variable
 * d’environnement — clé **anon** / **publishable** au lieu de **service_role** / **secret**.
 * Sur Vercel : vérifier l’environnement **Production** (pas seulement Preview / Development).
 */
import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseServiceRoleKey } from "@/lib/env"

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

/** Clés plateforme Supabase (non-JWT) — https://supabase.com/docs/guides/api/api-keys */
function assertElevatedSupabaseKey(key: string): void {
  const k = key.trim()
  if (k.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY : clé **publishable** (sb_publishable_…). " +
        "Il faut la clé **secret** (sb_secret_…) ou l’ancienne **service_role** (JWT). " +
        "Dashboard → Settings → API keys.",
    )
  }
  if (k.startsWith("sb_secret_")) {
    return
  }

  const jwtRole = jwtRoleFromSupabaseKey(k)
  if (jwtRole === "anon" || jwtRole === "authenticated") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY : clé **anon** / JWT utilisateur. " +
        "Mets **service_role** (Legacy API keys) ou **sb_secret_** (Secret). " +
        "Sinon PostgREST applique le RLS.",
    )
  }
  if (jwtRole === "service_role") {
    return
  }
  if (jwtRole != null) {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY : JWT avec role « ${jwtRole} ». ` +
        "Utilise service_role ou sb_secret_ du **même** projet que NEXT_PUBLIC_SUPABASE_URL.",
    )
  }
}

export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = getSupabaseServiceRoleKey()?.trim()

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante. " +
        "Supabase → Settings → API : **service_role** (legacy) ou **Secret** (sb_secret_…). " +
        "Vercel : ajouter pour l’environnement **Production**.",
    )
  }

  assertElevatedSupabaseKey(key)

  adminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return adminClient
}
