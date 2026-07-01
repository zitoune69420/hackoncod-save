/** Fichiers dans `public/flags/*.png` (sans extension). */
export const FLAG_SLUG_BY_ISO: Record<string, string> = {
  BR: "brazil",
  DE: "germany",
  ES: "spain",
  FR: "france",
  GB: "united-kingdom",
  IT: "italy",
  PH: "philippines",
  SA: "saudi-arabia",
  US: "united-states",
};

export function countryFlagSrc(code: string): string {
  const u = code.toUpperCase();
  if (!code || code.length !== 2 || u === "XX") {
    return "/flags/other.png";
  }
  const slug = FLAG_SLUG_BY_ISO[u];
  return slug ? `/flags/${slug}.png` : "/flags/other.png";
}
