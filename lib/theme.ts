/**
 * Gestion du thème de couleur et du fond de l'application.
 * Les couleurs sont en oklch (lightness chroma hue).
 */

export const THEME_STORAGE_KEY = "hackoncod_settings_theme"
export const BACKGROUND_STORAGE_KEY = "hackoncod_settings_background"
export const TOAST_STORAGE_KEY = "hackoncod_settings_toast"
export const NOTIFICATION_SOUND_STORAGE_KEY = "hackoncod_settings_notification_sound"
export const TOAST_POSITION_STORAGE_KEY = "hackoncod_settings_toast_position"

/** Émis quand la position du toaster change (temps réel depuis les paramètres). */
export const TOAST_POSITION_UPDATED_EVENT = "hackoncod-toast-position-updated"

/** Aligné sur la prop `position` de Sonner. */
export type ToastPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center"

const VALID_TOAST_POSITIONS: ToastPosition[] = [
  "top-left",
  "top-right",
  "top-center",
  "bottom-left",
  "bottom-right",
  "bottom-center",
]

/** Position Sonner par défaut (sans préférence en localStorage). */
export const DEFAULT_TOAST_POSITION: ToastPosition = "top-center"

export type ThemeColor = "purple" | "green" | "blue" | "red" | "orange" | "pink" | "cyan"

export type BackgroundColor =
  | "default"
  | "light"
  | "lighter"
  | "dark"
  | "darker"
  | "darkest"
  | "amoled"

export function getStoredTheme(): ThemeColor {
  if (typeof window === "undefined") return "purple"
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && isValidTheme(stored)) return stored as ThemeColor
  } catch {
    // ignore
  }
  return "purple"
}

export function setStoredTheme(theme: ThemeColor): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignore
  }
}

export function getStoredBackground(): BackgroundColor {
  if (typeof window === "undefined") return "darker"
  try {
    const stored = localStorage.getItem(BACKGROUND_STORAGE_KEY)
    if (stored && isValidBackground(stored)) return stored as BackgroundColor
  } catch {
    // ignore
  }
  return "darker"
}

export function setStoredBackground(bg: BackgroundColor): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(BACKGROUND_STORAGE_KEY, bg)
  } catch {
    // ignore
  }
}

export function getStoredToast(): boolean {
  if (typeof window === "undefined") return true
  try {
    const stored = localStorage.getItem(TOAST_STORAGE_KEY)
    if (stored === "false") return false
    return true
  } catch {
    return true
  }
}

export function setStoredToast(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(TOAST_STORAGE_KEY, enabled ? "true" : "false")
  } catch {
    // ignore
  }
}

export function getStoredNotificationSound(): boolean {
  if (typeof window === "undefined") return true
  try {
    const stored = localStorage.getItem(NOTIFICATION_SOUND_STORAGE_KEY)
    if (stored === "false") return false
    return true
  } catch {
    return true
  }
}

export function setStoredNotificationSound(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      NOTIFICATION_SOUND_STORAGE_KEY,
      enabled ? "true" : "false",
    )
  } catch {
    // ignore
  }
}

export function getStoredToastPosition(): ToastPosition {
  if (typeof window === "undefined") return DEFAULT_TOAST_POSITION
  try {
    const stored = localStorage.getItem(TOAST_POSITION_STORAGE_KEY)
    if (stored && isValidToastPosition(stored)) return stored
  } catch {
    // ignore
  }
  return DEFAULT_TOAST_POSITION
}

export function setStoredToastPosition(position: ToastPosition): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(TOAST_POSITION_STORAGE_KEY, position)
  } catch {
    // ignore
  }
}

function isValidTheme(value: string): value is ThemeColor {
  return ["purple", "green", "blue", "red", "orange", "pink", "cyan"].includes(value)
}

function isValidBackground(value: string): value is BackgroundColor {
  return ["default", "light", "lighter", "dark", "darker", "darkest", "amoled"].includes(value)
}

function isValidToastPosition(value: string): value is ToastPosition {
  return (VALID_TOAST_POSITIONS as readonly string[]).includes(value)
}

/** Backgrounds sombres qui nécessitent la classe .dark */
const DARK_BACKGROUNDS: BackgroundColor[] = ["dark", "darker", "darkest", "amoled"]

/**
 * Applique le fond au document (data-background + classe dark si nécessaire).
 */
export function applyBackgroundStyles(bg: BackgroundColor): void {
  const root = document.documentElement
  root.setAttribute("data-background", bg)
  if (DARK_BACKGROUNDS.includes(bg)) {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

/**
 * Applique le thème au document via data-theme (les couleurs sont en CSS).
 */
export function applyThemeStyles(theme: ThemeColor): void {
  document.documentElement.setAttribute("data-theme", theme)
}

/**
 * Applique thème couleur + fond, et dispatch l'événement.
 */
export function applyAllStyles(theme: ThemeColor, background: BackgroundColor): void {
  applyBackgroundStyles(background)
  applyThemeStyles(theme)
}

