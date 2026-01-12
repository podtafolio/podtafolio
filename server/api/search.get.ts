export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const term = query.term as string

  if (!term) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Query parameter "term" is required'
    })
  }

  try {
    return await searchPodcasts(term)
  } catch (error: any) {
    // If it's already a H3 error (created by createError), rethrow it
    if (error.statusCode) {
      throw error
    }

    // Otherwise wrap generic errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to search podcasts'
    })
  }
})
