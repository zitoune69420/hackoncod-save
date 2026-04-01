/**
 * Helper pour afficher des toasts, en respectant la préférence utilisateur.
 * N'affiche que si les notifications toast sont activées dans les paramètres.
 */

import { toast as sonnerToast } from "sonner"
import { getStoredToast } from "@/lib/theme"
import {
  tryPlayNotificationSound,
  type NotificationSoundVariant,
} from "@/lib/notification-sound"

function shouldShowToast(): boolean {
  if (typeof window === "undefined") return false
  return getStoredToast()
}

function playFor(variant: NotificationSoundVariant) {
  tryPlayNotificationSound(variant)
}

export function toast(message: string, options?: Parameters<typeof sonnerToast>[1]) {
  if (!shouldShowToast()) return
  sonnerToast(message, options)
  playFor("info")
}

toast.success = (message: string, options?: Parameters<typeof sonnerToast.success>[1]) => {
  if (!shouldShowToast()) return
  sonnerToast.success(message, options)
  playFor("success")
}

toast.error = (message: string, options?: Parameters<typeof sonnerToast.error>[1]) => {
  if (!shouldShowToast()) return
  sonnerToast.error(message, options)
  playFor("error")
}

toast.warning = (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) => {
  if (!shouldShowToast()) return
  sonnerToast.warning(message, options)
  playFor("warning")
}

toast.info = (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => {
  if (!shouldShowToast()) return
  sonnerToast.info(message, options)
  playFor("info")
}

toast.promise = sonnerToast.promise
