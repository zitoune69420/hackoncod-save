/** Tronque un texte avec une ellipse (le texte complet peut être affiché en `title`). */
export function truncateText(text: string, maxChars: number): string {
  const t = (text ?? "").trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars).trimEnd()}…`;
}
