import { episodes } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing episode ID'
    })
  }

  const episode = await db.query.episodes.findFirst({
    where: eq(episodes.id, id)
  })

  if (!episode) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Episode not found'
    })
  }

  return { data: episode }
})
