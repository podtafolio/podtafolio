import Parser from 'rss-parser';
import { db } from '../utils/db';
import { podcasts, episodes } from '../database/schema';
import { eq, and } from 'drizzle-orm';

const parser = new Parser({
    customFields: {
        item: [
            ['itunes:duration', 'duration'],
            ['itunes:image', 'image'],
        ],
    },
});

const feeds = [
    'https://feeds.acast.com/public/shows/6076586f2baca55c5d26290c', // Presunto
    'https://feeds.megaphone.fm/MAFIALANDSAS7149486171',             // A fondo
];

function parseDuration(durationStr: string | undefined): number | null {
    if (!durationStr) return null;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return parseInt(durationStr, 10) || null;
}

async function seed() {
    console.log('🌱 Starting seed...');

    for (const url of feeds) {
        try {
            console.log(`Fetching feed: ${url}`);
            const feed = await parser.parseURL(url);

            if (!feed.title) {
                console.error(`Feed ${url} has no title, skipping.`);
                continue;
            }

            console.log(`Processing podcast: ${feed.title}`);

            // Upsert Podcast
            // SQLite upsert in Drizzle: .onConflictDoUpdate({ target: podcasts.feedUrl, set: { ... } })
            // However, lastScrapedAt should be updated always.

            // Check if podcast exists first to get ID easily or just use return
            const existingPodcast = await db.select().from(podcasts).where(eq(podcasts.feedUrl, url)).get();

            let podcastId: number;

            if (existingPodcast) {
                // Update
                await db.update(podcasts)
                    .set({
                        title: feed.title,
                        description: feed.description,
                        imageUrl: feed.image?.url || feed.itunes?.image,
                        author: feed.itunes?.author,
                        websiteUrl: feed.link,
                        lastScrapedAt: new Date(),
                        updatedAt: new Date()
                    })
                    .where(eq(podcasts.id, existingPodcast.id));
                podcastId = existingPodcast.id;
                console.log(`Updated podcast: ${feed.title} (ID: ${podcastId})`);
            } else {
                // Insert
                const inserted = await db.insert(podcasts).values({
                    title: feed.title,
                    description: feed.description,
                    feedUrl: url,
                    imageUrl: feed.image?.url || feed.itunes?.image,
                    author: feed.itunes?.author,
                    websiteUrl: feed.link,
                    lastScrapedAt: new Date(),
                }).returning({ id: podcasts.id });
                podcastId = inserted[0].id;
                console.log(`Inserted podcast: ${feed.title} (ID: ${podcastId})`);
            }

            // Process Episodes
            if (feed.items && feed.items.length > 0) {
                console.log(`Processing ${feed.items.length} episodes...`);
                let newEpisodesCount = 0;

                for (const item of feed.items) {
                    if (!item.title || !item.guid || !item.enclosure?.url) {
                        continue;
                    }

                    // Check if episode exists for this podcast with this guid
                    const existingEpisode = await db.select()
                        .from(episodes)
                        .where(and(
                            eq(episodes.podcastId, podcastId),
                            eq(episodes.guid, item.guid)
                        ))
                        .get();

                    if (!existingEpisode) {
                        await db.insert(episodes).values({
                            podcastId: podcastId,
                            title: item.title,
                            description: item.contentSnippet || item.content,
                            audioUrl: item.enclosure.url,
                            publishedAt: item.pubDate ? new Date(item.pubDate) : null,
                            duration: parseDuration(item.duration),
                            guid: item.guid,
                        });
                        newEpisodesCount++;
                    }
                }
                console.log(`Added ${newEpisodesCount} new episodes for ${feed.title}.`);
            }

        } catch (error) {
            console.error(`Error processing feed ${url}:`, error);
        }
    }

    console.log('✅ Seed complete.');
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
