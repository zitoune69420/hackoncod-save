/**
 * Blocage heuristique bots / scrapeurs / crawl IA (Edge).
 */

/**
 * Bots de confiance autorisés à crawler le site (SEO, monitoring, previews).
 * Court-circuite à la fois le filtre UA et le check VPN/proxy
 * (les IPs Google/Vercel sortent de datacenters et sont sinon flaguées).
 */
const TRUSTED_BOT_FRAGMENTS: readonly string[] = [
  // Google
  "googlebot",
  "googleother",
  "google-inspectiontool",
  "google-site-verification",
  "google-pagespeed",
  "chrome-lighthouse",
  "adsbot-google",
  "mediapartners-google",
  "apis-google",
  "feedfetcher-google",
  // Bing / Microsoft
  "bingbot",
  "bingpreview",
  "msnbot",
  // Yahoo
  "slurp",
  // DuckDuckGo
  "duckduckbot",
  "duckduckpreview",
  // Yandex
  "yandex",
  // Apple
  "applebot",
  // Vercel
  "vercel-screenshot",
  "vercel-favicon",
  "vercel-og-image",
  "vercel-edge",
  // Social / chat link previews
  "discordbot",
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "linkedinbot",
  "slackbot-linkexpanding",
  "slack-imgproxy",
  "telegrambot",
];

export function isTrustedBotUserAgent(ua: string | null): boolean {
  const s = (ua ?? "").trim().toLowerCase();
  if (!s) return false;
  for (const frag of TRUSTED_BOT_FRAGMENTS) {
    if (s.includes(frag)) return true;
  }
  return false;
}

const BOT_FRAGMENTS: readonly string[] = [
  "amazonbot",
  "ahrefsbot",
  "ahrefssiteaudit",
  "baiduspider",
  "bytespider",
  "ccbot",
  "chatgpt-user",
  "curl/",
  "dataforseo",
  "go-http-client",
  "google-extended",
  "gptbot",
  "httpclient",
  "ia_archiver",
  "axios/",
  "java/",
  "wget/",
  "meta-externalagent",
  "meta-externalfetcher",
  "mj12bot",
  "oai-searchbot",
  "omgili",
  "omgilibot",
  "perl ",
  "php/",
  "petalbot",
  "postman/",
  "perplexity",
  "scrapy",
  "semrushbot",
  "siteauditbot",
  "tiktokspider",
  "urllib",
  "vertex-web-crawler",
  "apache-httpclient",
  "claudebot",
  "claude-web",
  "anthropic-ai",
  "cohere-ai",
  "imagesift",
  "headlesschrome",
  "puppeteer",
  "playwright",
  "ahrefs",
  "semrush",
  "datadog",
  "uptimerobot",
];

function norm(ua: string | null): string {
  return (ua ?? "").trim().toLowerCase();
}

/** true = bloqué (politique « zéro bot » heuristique). */
export function isBlockedAutomationUserAgent(ua: string | null): boolean {
  if (isTrustedBotUserAgent(ua)) return false;
  const s = norm(ua);
  if (!s) return true;
  if (s.length < 28) return true;

  for (const frag of BOT_FRAGMENTS) {
    if (s.includes(frag)) return true;
  }

  if (
    /^mozilla\/[\d.]+\s*$/i.test(s) ||
    /^mozilla\/\d+\.\d+\s+\([^)]*\)\s*$/i.test(s)
  ) {
    return true;
  }

  return !/\b(gecko|applewebkit|chrome|safari|edg|firefox|opr|version)\//i.test(
    s,
  );
}
