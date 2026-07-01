/**
 * Paramètre d’URL `pagination` pour les tableaux paginés (CommonTable).
 * Valeur attendue : entier ≥ 1 (1 = première section).
 * Si absent ou non strictement numérique → ne pas appliquer (retour `null`).
 */
export function parsePaginationQueryParam(raw: string | null): number | null {
  if (raw == null || raw === "") return null
  if (!/^\d+$/.test(raw)) return null
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n) || n < 1) return null
  return n
}
