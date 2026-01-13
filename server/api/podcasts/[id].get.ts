import { podcasts } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing podcast ID'
    })
  }

  const podcast = await db.query.podcasts.findFirst({
    where: eq(podcasts.id, id)
  })

  if (!podcast) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Podcast not found'
    })
  }

  return { data: podcast }
})
