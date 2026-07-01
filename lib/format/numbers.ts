export function formatEnInt(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

/** Ex. 1400 → "1.4K" pour les libellés compacts. */
export function formatCompactCount(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
