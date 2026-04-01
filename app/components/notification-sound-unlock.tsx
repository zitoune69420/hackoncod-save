"use client";

import * as React from "react";
import { primeNotificationAudioFromUserGesture } from "@/lib/notification-sound";

/**
 * Enregistre un premier geste pour débloquer la lecture audio (autoplay).
 * Safari / iOS : privilégier touchend (souvent requis pour un premier play fiable).
 */
export function NotificationSoundUnlock() {
  React.useEffect(() => {
    const onInteract = () => {
      primeNotificationAudioFromUserGesture();
    };
    window.addEventListener("pointerdown", onInteract, { capture: true, passive: true });
    window.addEventListener("touchstart", onInteract, { capture: true, passive: true });
    window.addEventListener("touchend", onInteract, { capture: true, passive: true });
    window.addEventListener("keydown", onInteract, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", onInteract, { capture: true });
      window.removeEventListener("touchstart", onInteract, { capture: true });
      window.removeEventListener("touchend", onInteract, { capture: true });
      window.removeEventListener("keydown", onInteract, { capture: true });
    };
  }, []);

  return null;
}
