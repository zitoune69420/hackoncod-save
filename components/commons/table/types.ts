export type Column<T> = {
  key: keyof T
  label: string
  render?: (row: T) => React.ReactNode
}

export type CommonTableProps<T> = {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
}