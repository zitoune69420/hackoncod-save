"use client"

import { useEffect } from "react"
import {
  getStoredTheme,
  getStoredBackground,
  applyBackgroundStyles,
  applyThemeStyles,
} from "@/lib/theme"

const THEME_UPDATED_EVENT = "settings-updated"

function apply() {
  applyBackgroundStyles(getStoredBackground())
  applyThemeStyles(getStoredTheme())
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    apply()
  }, [])

  useEffect(() => {
    window.addEventListener(THEME_UPDATED_EVENT, apply)
    return () => window.removeEventListener(THEME_UPDATED_EVENT, apply)
  }, [])

  return <>{children}</>
}
