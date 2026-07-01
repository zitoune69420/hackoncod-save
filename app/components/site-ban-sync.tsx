"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const LS_KEY = "hackoncod_site_blocked";

/**
 * Vérifie en base (session + IP / Discord) et aligne localStorage + redirect /banned.
 */
export function SiteBanSync() {
  const router = useRouter();
  const pathname = usePathname();
  const ran = useRef(false);

  useEffect(() => {
    if (pathname?.startsWith("/banned")) {
      try {
        localStorage.setItem(LS_KEY, "1");
      } catch {
        /* ignore */
      }
      return;
    }

    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const res = await fetch("/api/ban/status", {
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as {
          banned?: boolean;
        };
        if (data.banned) {
          try {
            localStorage.setItem(LS_KEY, "1");
          } catch {
            /* ignore */
          }
          document.cookie = `${LS_KEY}=1; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
          router.replace("/banned");
        } else {
          try {
            localStorage.removeItem(LS_KEY);
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, [pathname, router]);

  return null;
}
