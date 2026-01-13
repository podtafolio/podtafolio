import { type H3Event, getQuery } from 'h3'

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export function getPaginationParams(event: H3Event): PaginationParams {
  const query = getQuery(event)

  let page = parseInt(String(query.page ?? '1'))
  if (isNaN(page) || page < 1) page = 1

  let limit = parseInt(String(query.limit ?? '30'))
  if (isNaN(limit) || limit < 1) limit = 30

  const offset = (page - 1) * limit

  return { page, limit, offset }
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit)
    }
  }
}
