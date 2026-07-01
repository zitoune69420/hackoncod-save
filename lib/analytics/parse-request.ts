import { UAParser } from "ua-parser-js";

export function countryFromRequestHeaders(headers: Headers): string | null {
  const raw =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("cloudfront-viewer-country");
  const v = raw?.trim().toUpperCase();
  if (!v || v.length !== 2) {
    return null;
  }
  return v;
}

export function parseUserAgent(ua: string | null): {
  device_type: string;
  browser: string;
  os: string;
} {
  if (!ua?.trim()) {
    return { device_type: "desktop", browser: "Unknown", os: "Unknown" };
  }
  const p = new UAParser(ua);
  const deviceType = p.getDevice().type;
  const device_type =
    deviceType === "mobile" || deviceType === "tablet"
      ? deviceType
      : "desktop";
  const b = p.getBrowser();
  const browser = [b.name, b.version?.split(".").slice(0, 1).join("") || ""]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unknown";
  const o = p.getOS();
  const os =
    [o.name, o.version?.split(".").slice(0, 2).join(".")].filter(Boolean).join(
      " ",
    ).trim() || "Unknown";
  return { device_type, browser, os };
}

export function hostnameFromUrl(href: string): string | null {
  try {
    return new URL(href).hostname || null;
  } catch {
    return null;
  }
}

export function hostFromReferrer(referrer: string | null | undefined): string | null {
  if (!referrer?.trim()) {
    return null;
  }
  try {
    return new URL(referrer).hostname || null;
  } catch {
    return null;
  }
}

export function utmFromUrl(
  href: string,
): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} {
  try {
    const u = new URL(href);
    return {
      utm_source: u.searchParams.get("utm_source"),
      utm_medium: u.searchParams.get("utm_medium"),
      utm_campaign: u.searchParams.get("utm_campaign"),
    };
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null };
  }
}
