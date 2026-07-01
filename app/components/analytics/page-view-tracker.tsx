"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const VID_KEY = "analytics_vid";
const SID_KEY = "analytics_sid";

function ensureVisitorId(): string {
  try {
    let id = localStorage.getItem(VID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function ensureSessionId(): string {
  try {
    let id = sessionStorage.getItem(SID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function PageViewTracker() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ANALYTICS_DISABLED === "1") {
      return;
    }

    const search = qs;
    const pathOnly = pathname.split("?")[0] || "/";
    const dedupeKey = `${pathOnly}?${search}`;

    const t = window.setTimeout(() => {
      if (lastSent.current === dedupeKey) {
        return;
      }
      lastSent.current = dedupeKey;

      const visitorId = ensureVisitorId();
      const sessionId = ensureSessionId();
      const href =
        typeof window !== "undefined" ? window.location.href : pathOnly;

      void fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          path: pathOnly,
          href,
          referrer: document.referrer || null,
          visitorId,
          sessionId,
        }),
      }).catch(() => {});
    }, 200);

    return () => window.clearTimeout(t);
  }, [pathname, qs]);

  return null;
}
