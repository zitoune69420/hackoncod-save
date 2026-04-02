/**
 * Prépare le texte forum (échappements JSON / `\n` littéraux, CRLF).
 * Module sans "use client" — utilisable depuis RSC et Client Components.
 */
export function normalizeForumMarkdownSource(raw: string): string {
  return raw
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}
