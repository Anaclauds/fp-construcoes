export interface MetaPaginacao {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Paginado<T> {
  data: T[]
  meta: MetaPaginacao
}
