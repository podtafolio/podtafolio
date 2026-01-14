import { type H3Event, getQuery } from 'h3'
import { z } from 'zod'

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

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(30)
})

export function getPaginationParams(event: H3Event): PaginationParams {
  const query = getQuery(event)

  const result = paginationSchema.parse(query)

  const { page, limit } = result
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
