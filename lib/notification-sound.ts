/**
 * Son court joué lors d’une notification toast (si l’option est activée dans les paramètres).
 */

import { getStoredNotificationSound } from "@/lib/theme"

let sharedCtx: AudioContext | null = null

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (sharedCtx && sharedCtx.state !== "closed") return sharedCtx
  try {
    const AC =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext
        }
      ).webkitAudioContext
    if (!AC) return null
    sharedCtx = new AC()
    return sharedCtx
  } catch {
    return null
  }
}

/** Joue un signal bref si les sons de notification sont activés. */
export function tryPlayNotificationSound(): void {
  if (typeof window === "undefined") return
  if (!getStoredNotificationSound()) return
  const ctx = getSharedAudioContext()
  if (!ctx) return
  try {
    void ctx.resume().catch(() => {})
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.06, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(523.25, now)
    osc.connect(gain)
    osc.start(now)
    osc.stop(now + 0.14)
  } catch {
    // autoplay / context fermé, etc.
  }
}
