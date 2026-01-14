import { z } from 'zod'

const iTunesPodcastSchema = z.object({
  collectionName: z.string(),
  feedUrl: z.string().optional(),
  artworkUrl600: z.string().optional(),
  artworkUrl100: z.string().optional(),
  artistName: z.string().optional(),
  collectionViewUrl: z.string().optional(),
})

const iTunesSearchResponseSchema = z.object({
  resultCount: z.number(),
  results: z.array(iTunesPodcastSchema)
})

export type iTunesPodcast = z.infer<typeof iTunesPodcastSchema>

export const searchPodcasts = async (term: string) => {
  try {
    const rawResponse = await $fetch('https://itunes.apple.com/search', {
      params: {
        term,
        media: 'podcast',
        entity: 'podcast'
      }
    })

    // Parse JSON if it comes back as a string (itunes sometimes sends text/javascript content type)
    let response = rawResponse;
    if (typeof rawResponse === 'string') {
        try {
            response = JSON.parse(rawResponse);
        } catch (e) {
            console.error('Failed to parse iTunes response string:', rawResponse);
            throw e;
        }
    }

    // Validate response with Zod
    const parsedResponse = iTunesSearchResponseSchema.parse(response)

    // Normalize and filter
    return parsedResponse.results
      .filter((item) => item.feedUrl) // Ensure feedUrl exists
      .map((item) => ({
        title: item.collectionName,
        description: null,
        feedUrl: item.feedUrl!, // We filtered above, so this is safe
        imageUrl: item.artworkUrl600 || item.artworkUrl100 || null,
        author: item.artistName || null,
        websiteUrl: item.collectionViewUrl || null
      }))
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('iTunes Validation Error:', JSON.stringify(error.errors, null, 2))
      throw createError({
        statusCode: 502,
        statusMessage: 'Invalid response from iTunes provider'
      })
    }
    console.error('iTunes Search Error:', error)
    throw error
  }
}
