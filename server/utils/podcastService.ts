import { eq, sql, like, or, inArray } from 'drizzle-orm';
import { podcasts, episodes } from '../database/schema';
import { db } from '../utils/db';
import { parsePodcastFeed } from './feedParser';

/**
 * Imports a podcast from a feed URL into the database.
 * This function is intended to run asynchronously.
 *
 * @param feedUrl The RSS feed URL.
 * @param podcastId The ID of the podcast record in the database.
 */
export async function importPodcast(feedUrl: string, podcastId: string) {
  console.log(`[Import] Starting import for podcast ${podcastId} (${feedUrl})`);

  try {
    // 1. Parse the feed
    const feedData = await parsePodcastFeed(feedUrl);
    console.log(`[Import] Feed parsed successfully: ${feedData.title} with ${feedData.episodes.length} episodes`);

    // 2. Update podcast metadata and insert episodes in a transaction
    await db.transaction(async (tx) => {
      // Update podcast details
      await tx.update(podcasts)
        .set({
          title: feedData.title,
          description: feedData.description,
          imageUrl: feedData.imageUrl,
          author: feedData.author,
          websiteUrl: feedData.websiteUrl,
          status: 'ready',
          lastScrapedAt: new Date(),
          updatedAt: new Date(),
          importError: null, // Clear any previous error
        })
        .where(eq(podcasts.id, podcastId));

      // Insert episodes
      // Note: "Import All". We iterate and insert.
      // Optimization: We could check for existing GUIDs if this was a re-import,
      // but for a fresh import (status=importing), we assume empty or we just insert.
      // However, to be robust against re-runs, we should probably do an "upsert" or check.
      // SQLite/Drizzle upsert: .onConflictDoUpdate()

      if (feedData.episodes.length > 0) {
        // Prepare episode values
        const episodeValues = feedData.episodes.map(ep => ({
          podcastId: podcastId,
          title: ep.title,
          description: ep.description,
          audioUrl: ep.audioUrl,
          imageUrl: ep.imageUrl,
          publishedAt: ep.publishedAt,
          duration: ep.duration,
          guid: ep.guid,
          updatedAt: new Date(),
        }));

        // Batch insert is more efficient. SQLite has limits on variables, but 100-500 should be fine.
        // If thousands, we might need to chunk.
        // Let's assume a reasonable batch size or just rely on Drizzle's handling?
        // Drizzle might not auto-chunk. Let's do a simple loop or large insert.
        // For safety with large feeds, let's chunk it.

        const chunkSize = 50;
        for (let i = 0; i < episodeValues.length; i += chunkSize) {
            const chunk = episodeValues.slice(i, i + chunkSize);
            await tx.insert(episodes).values(chunk)
                .onConflictDoUpdate({
                    target: [episodes.podcastId, episodes.guid],
                    set: {
                        title: sql`excluded.title`,
                        description: sql`excluded.description`,
                        audioUrl: sql`excluded.audio_url`,
                        imageUrl: sql`excluded.image_url`,
                        duration: sql`excluded.duration`,
                        publishedAt: sql`excluded.published_at`,
                        updatedAt: new Date(),
                    }
                });
        }
      }
    });

    console.log(`[Import] Successfully imported podcast ${podcastId}`);

  } catch (error: any) {
    console.error(`[Import] Failed to import podcast ${podcastId}:`, error);

    // Update status to error
    try {
        await db.update(podcasts)
            .set({
                status: 'error',
                importError: error.message || 'Unknown error',
                updatedAt: new Date(),
            })
            .where(eq(podcasts.id, podcastId));
    } catch (dbError) {
        console.error(`[Import] Failed to save error status for ${podcastId}:`, dbError);
    }
  }
}

/**
 * Searches for podcasts in the local database by term or matching feed URLs.
 *
 * @param term Search term for title or author
 * @param feedUrls List of feed URLs to check for existence
 */
export async function findPodcastsByTermOrFeedUrls(term: string, feedUrls: string[]) {
  const searchCondition = or(
    // SQLite LIKE is case-insensitive by default
    like(podcasts.title, `%${term}%`),
    like(podcasts.author, `%${term}%`)
  );

  let finalCondition;
  if (feedUrls.length > 0) {
    // Check if term matches OR feedUrl matches
    finalCondition = or(searchCondition, inArray(podcasts.feedUrl, feedUrls));
  } else {
    finalCondition = searchCondition;
  }

  return await db.select().from(podcasts).where(finalCondition);
}
