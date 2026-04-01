"use client"

import { toast as sonnerToast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  MultiplicationSignCircleIcon,
  Alert02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { getStoredToast } from "@/lib/theme"
import { tryPlayNotificationSound } from "@/lib/notification-sound"

export type ToastVariant = "success" | "error" | "warning" | "info"

export interface ToastOptions {
  text: string
  icon?: React.ReactNode
  variant?: ToastVariant
  /** Si true, affiche le toast même si les notifications sont désactivées (ex. confirmation de sauvegarde des paramètres). */
  force?: boolean
  /** Bouton d’action (ex. « Ajouter un avis »). */
  action?: { label: string; onClick: () => void }
  /**
   * Si true, ne joue aucun son. Si omis : les toasts `force` sont muets ;
   * les autres respectent le son de notification utilisateur.
   */
  muteSound?: boolean
}

const defaultIcons: Record<ToastVariant, React.ReactNode> = {
  success: <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />,
  error: <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-4" />,
  warning: <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />,
  info: <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />,
}

const variantToSonner = {
  success: sonnerToast.success,
  error: sonnerToast.error,
  warning: sonnerToast.warning,
  info: sonnerToast.info,
} as const

export function showToast({
  text,
  icon,
  variant = "info",
  force,
  action,
  muteSound,
}: ToastOptions) {
  const iconNode = icon ?? defaultIcons[variant]
  const opts = {
    icon: iconNode,
    ...(action ? { action: { label: action.label, onClick: action.onClick } } : {}),
  }

  const effectiveMute = muteSound !== undefined ? muteSound : Boolean(force)

  if (force) {
    variantToSonner[variant](text, opts)
  } else {
    if (typeof window !== "undefined" && !getStoredToast()) {
      return
    }
    variantToSonner[variant](text, opts)
  }

  if (!effectiveMute) {
    tryPlayNotificationSound(variant)
  }
}
