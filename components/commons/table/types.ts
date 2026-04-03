export type Column<T> = {
  key: keyof T
  label: string
  /** Classes pour le `<td>` (ex. `whitespace-normal` pour du texte long). */
  cellClassName?: string
  render?: (row: T) => React.ReactNode
}

export type CommonTableProps<T> = {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  /**
   * Entrée en cascade des lignes (léger ressort). Désactivé par défaut pour
   * ne pas modifier le comportement des autres tableaux.
   */
  rowEntranceAnimation?: boolean
}