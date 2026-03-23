"use client"

import { toast as sonnerToast } from "sonner"
import { toast } from "@/lib/toast"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  MultiplicationSignCircleIcon,
  Alert02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"

export type ToastVariant = "success" | "error" | "warning" | "info"

export interface ToastOptions {
  text: string
  icon?: React.ReactNode
  variant?: ToastVariant
  /** Si true, affiche le toast même si les notifications sont désactivées (ex. confirmation de sauvegarde des paramètres). */
  force?: boolean
}

const defaultIcons: Record<ToastVariant, React.ReactNode> = {
  success: <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />,
  error: <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-4" />,
  warning: <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />,
  info: <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />,
}

const variantMap = {
  success: toast.success,
  error: toast.error,
  warning: toast.warning,
  info: toast.info,
} as const

/** Contourne la préférence utilisateur (même usage que variantMap, sans filtre getStoredToast). */
const variantMapForced = {
  success: sonnerToast.success,
  error: sonnerToast.error,
  warning: sonnerToast.warning,
  info: sonnerToast.info,
} as const

export function showToast({ text, icon, variant = "info", force }: ToastOptions) {
  const fn = force ? variantMapForced[variant] : variantMap[variant]
  const iconNode = icon ?? defaultIcons[variant]
  fn(text, { icon: iconNode })
}
