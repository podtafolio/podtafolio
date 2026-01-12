import { z } from 'zod'
import { podcasts } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { importPodcast } from '../../utils/podcastService'
import { db } from '../../utils/db'

const importBodySchema = z.object({
  feedUrl: z.string().url()
})

export default defineEventHandler(async (event) => {
  // 1. Validate Input
  const body = await readBody(event)
  const validationResult = importBodySchema.safeParse(body)

  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid feed URL',
      data: validationResult.error.errors
    })
  }

  const { feedUrl } = validationResult.data

  // 2. Check if podcast already exists
  const existingPodcast = await db.query.podcasts.findFirst({
    where: eq(podcasts.feedUrl, feedUrl),
    columns: {
        id: true,
        status: true
    }
  })

  if (existingPodcast) {
    if (existingPodcast.status === 'error') {
        // Retry import in background
        await db.update(podcasts)
            .set({ status: 'importing', importError: null, updatedAt: new Date() })
            .where(eq(podcasts.id, existingPodcast.id));

        importPodcast(feedUrl, existingPodcast.id).catch(err => {
            console.error('Background import retry failed trigger:', err)
        })

        return {
            id: existingPodcast.id,
            status: 'importing',
            isNew: false
        }
    }

    return {
      id: existingPodcast.id,
      status: existingPodcast.status,
      isNew: false
    }
  }

  // 3. Create new record
  const [newPodcast] = await db.insert(podcasts).values({
    title: 'Importing...', // Placeholder
    feedUrl: feedUrl,
    status: 'importing'
  }).returning({ id: podcasts.id, status: podcasts.status })

  // 4. Trigger background import
  // Do not await this
  importPodcast(feedUrl, newPodcast.id).catch(err => {
    console.error('Background import failed trigger:', err)
  })

  return {
    id: newPodcast.id,
    status: newPodcast.status,
    isNew: true
  }
})
