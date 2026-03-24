import { createAuthClient } from "better-auth/react"

/**
 * URL publique du handler `/api/auth`.
 * - **Navigateur** : `window.location.origin` → même origine que la page (évite les appels vers
 *   `localhost` en prod si `NEXT_PUBLIC_APP_URL` n’est pas défini au build).
 * - **SSR / Node** : `NEXT_PUBLIC_APP_URL`, puis `VERCEL_URL` (Vercel), sinon localhost.
 */
function getAuthBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return `http://localhost:${process.env.PORT ?? "3000"}`
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
})