import { podcasts } from '../../database/schema'
import { eq, like, and, count, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const pagination = getPaginationParams(event)
  const { limit, offset } = pagination
  const query = getQuery(event)
  const search = query.search as string | undefined

  const conditions = [eq(podcasts.status, 'ready')]
  if (search) {
    conditions.push(like(podcasts.title, `%${search}%`))
  }

  const whereClause = and(...conditions)

  // Count total
  const [{ value: total }] = await db
    .select({ value: count() })
    .from(podcasts)
    .where(whereClause)

  // Fetch data
  const data = await db
    .select()
    .from(podcasts)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(asc(podcasts.title))

  return createPaginatedResponse(data, total, pagination)
})
