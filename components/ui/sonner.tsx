"use client"

import { useEffect, useState } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, InformationCircleIcon, Alert02Icon, MultiplicationSignCircleIcon, Loading03Icon } from "@hugeicons/core-free-icons"
import {
  DEFAULT_TOAST_POSITION,
  getStoredToastPosition,
  TOAST_POSITION_UPDATED_EVENT,
  type ToastPosition,
} from "@/lib/theme"

const Toaster = ({ ...props }: ToasterProps) => {
  const [position, setPosition] = useState<ToastPosition>(() =>
    typeof window !== "undefined" ? getStoredToastPosition() : DEFAULT_TOAST_POSITION,
  )

  useEffect(() => {
    const sync = () => setPosition(getStoredToastPosition())
    sync()
    window.addEventListener(TOAST_POSITION_UPDATED_EVENT, sync)
    return () => window.removeEventListener(TOAST_POSITION_UPDATED_EVENT, sync)
  }, [])

  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
        ),
        info: (
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />
        ),
        warning: (
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
        ),
        error: (
          <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-4" />
        ),
        loading: (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
      position={position}
    />
  )
}

export { Toaster }
