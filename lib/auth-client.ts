import { createAuthClient } from "better-auth/react"

/**
 * Même origine que l’app en prod : définir NEXT_PUBLIC_APP_URL (ex. https://hackoncod.com).
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
})