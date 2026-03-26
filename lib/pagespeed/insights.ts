import "server-only";

const PSI_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export type PageSpeedStrategy = "mobile" | "desktop";

/**
 * Appelle l’API PageSpeed Insights v5 (Lighthouse + CrUX quand dispo).
 * @see https://developers.google.com/speed/docs/insights/v5/get-started
 */
export async function fetchPageSpeedInsightsJson(
  pageUrl: string,
  strategy: PageSpeedStrategy,
  apiKey: string,
): Promise<unknown | null> {
  try {
    const u = new URL(PSI_BASE);
    u.searchParams.set("url", pageUrl);
    u.searchParams.set("key", apiKey);
    u.searchParams.set("strategy", strategy);
    u.searchParams.append("category", "performance");

    const res = await fetch(u.toString(), {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[pagespeed]", res.status, body.slice(0, 500));
      return null;
    }

    return await res.json();
  } catch (e) {
    console.error("[pagespeed] fetch", e);
    return null;
  }
}
