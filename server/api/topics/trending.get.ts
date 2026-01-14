import { db } from '../../utils/db';
import { topics, episodesTopics, episodes } from '../../database/schema';
import { eq, desc, sql, gt } from 'drizzle-orm';

export default defineCachedEventHandler(async (event) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.select({
        id: topics.id,
        name: topics.name,
        count: sql<number>`count(${episodesTopics.episodeId})`
    })
    .from(topics)
    .innerJoin(episodesTopics, eq(topics.id, episodesTopics.topicId))
    .innerJoin(episodes, eq(episodesTopics.episodeId, episodes.id))
    .where(gt(episodes.publishedAt, thirtyDaysAgo))
    .groupBy(topics.id)
    .orderBy(desc(sql`count(${episodesTopics.episodeId})`))
    .limit(5);

    return {
        data: result
    };
}, {
  maxAge: 60 * 60, // 1 hour
  swr: true,
});
