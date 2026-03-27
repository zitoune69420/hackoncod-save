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
}