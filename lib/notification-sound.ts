/**
 * Sons joués lors d’une notification toast (si l’option est activée dans les paramètres).
 * Fichiers : `public/audio/*.mp3`
 *
 * Les navigateurs bloquent souvent `audio.play()` hors « geste utilisateur ».
 * On appelle `primeNotificationAudioFromUserGesture()` au premier clic/touche sur la page
 * pour débloquer la lecture ensuite (ex. toast après réponse API).
 */

import { getStoredNotificationSound } from "@/lib/theme"

export type NotificationSoundVariant = "success" | "error" | "warning" | "info"

const SOUND_SRC: Record<NotificationSoundVariant, string> = {
  success: "/audio/success_sound.mp3",
  error: "/audio/failure_sound.mp3",
  warning: "/audio/warning_sound.mp3",
  info: "/audio/success_sound.mp3",
}

const DEFAULT_VOLUME = 0.4

/** WAV silencieux minimal — sert uniquement au déblocage autoplay après interaction. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"

let primed = false

function markPrimed(audio: HTMLAudioElement) {
  try {
    audio.pause()
    audio.currentTime = 0
  } catch {
    // ignore
  }
  primed = true
}

/**
 * À appeler depuis un geste utilisateur (pointerdown / touchend sur iOS, keydown…).
 * Safari (surtout iOS) refuse souvent les premiers `play()` asynchrones sans ça, et peut
 * rejeter les `data:` audio — d’où un repli sur un vrai fichier MP3.
 */
export function primeNotificationAudioFromUserGesture(): void {
  if (typeof window === "undefined" || primed) return

  const tryUnlockMp3 = (mutedFirst: boolean) => {
    if (primed) return
    const a = new Audio(SOUND_SRC.success)
    a.volume = 0.0001
    if (mutedFirst) a.muted = true
    const p = a.play()
    if (p === undefined) return
    void p
      .then(() => {
        if (mutedFirst) a.muted = false
        markPrimed(a)
      })
      .catch(() => {
        if (!mutedFirst) tryUnlockMp3(true)
      })
  }

  try {
    const a = new Audio(SILENT_WAV)
    a.volume = 0.0001
    const p = a.play()
    if (p === undefined) {
      tryUnlockMp3(false)
      return
    }
    void p
      .then(() => markPrimed(a))
      .catch(() => tryUnlockMp3(false))
  } catch {
    tryUnlockMp3(false)
  }
}

const audioPool: Partial<Record<NotificationSoundVariant, HTMLAudioElement>> =
  {}

function getPooledAudio(variant: NotificationSoundVariant): HTMLAudioElement {
  let el = audioPool[variant]
  if (!el) {
    el = new Audio(SOUND_SRC[variant])
    el.preload = "auto"
    void el.load()
    audioPool[variant] = el
  }
  return el
}

/** Joue le fichier audio associé au type de toast si les sons sont activés. */
export function tryPlayNotificationSound(
  variant: NotificationSoundVariant = "info",
): void {
  if (typeof window === "undefined") return
  if (!getStoredNotificationSound()) return
  try {
    const audio = getPooledAudio(variant)
    audio.volume = DEFAULT_VOLUME
    audio.currentTime = 0
    const p = audio.play()
    if (p !== undefined) void p.catch(() => {})
  } catch {
    // ignore
  }
}
