/**
 * Blocage heuristique bots / scrapeurs / crawl IA (Edge).
 */

const BOT_FRAGMENTS: readonly string[] = [
  "amazonbot",
  "applebot",
  "ahrefsbot",
  "ahrefssiteaudit",
  "baiduspider",
  "bingbot",
  "bytespider",
  "ccbot",
  "chatgpt-user",
  "chrome-lighthouse",
  "curl/",
  "dataforseo",
  "discordbot",
  "duckduckbot",
  "duckduckpreview",
  "facebookexternalhit",
  "facebot",
  "go-http-client",
  "google-extended",
  "google-inspectiontool",
  "googlebot",
  "google-read-aloud",
  "googleproducer",
  "gptbot",
  "httpclient",
  "ia_archiver",
  "axios/",
  "java/",
  "wget/",
  "linkedinbot",
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
  "slackbot-linkexpanding",
  "siteauditbot",
  "slack-imgproxy",
  "slurp",
  "telegrambot",
  "tiktokspider",
  "twitterbot",
  "urllib",
  "vertex-web-crawler",
  "yandex",
  "apache-httpclient",
  "bingpreview",
  "claudebot",
  "claude-web",
  "anthropic-ai",
  "cohere-ai",
  "imagesift",
  "headlesschrome",
  "puppeteer",
  "playwright",
  "msnbot",
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
