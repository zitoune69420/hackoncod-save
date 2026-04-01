/**
 * Système de traduction i18n.
 * Utilise les fichiers messages/{locale}.json
 */

export const LANGUAGE_STORAGE_KEY = "hackoncod_settings_language"

export type Locale = "fr" | "en"

export const SUPPORTED_LOCALES: Locale[] = ["fr", "en"]

export const DEFAULT_LOCALE: Locale = "en"

export type Messages = Record<string, unknown>

import frMessages from "@/messages/fr.json"
import enMessages from "@/messages/en.json"

const messagesByLocale: Record<Locale, Messages> = {
  fr: frMessages as Messages,
  en: enMessages as Messages,
}

export function loadMessages(locale: Locale): Messages {
  return messagesByLocale[locale] ?? messagesByLocale[DEFAULT_LOCALE]
}

export function getStoredLanguage(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && isValidLocale(stored)) return stored as Locale
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE
}

export function setStoredLanguage(locale: Locale): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale)
  } catch {
    // ignore
  }
}

function isValidLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale)
}

/**
 * Récupère une traduction par clé pointée (ex: "settings.appearance.title").
 * Supporte l'interpolation {{key}}.
 */
export function getMessage(
  messages: Messages,
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split(".")
  let value: unknown = messages
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      return key
    }
  }
  if (typeof value !== "string") return key
  if (!params) return value
  return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
    return paramKey in params ? String(params[paramKey]) : `{{${paramKey}}}`
  })
}

export const I18N_UPDATED_EVENT = "i18n-updated"
