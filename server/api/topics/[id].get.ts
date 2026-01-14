import { db } from "../../utils/db";
import {
  topics,
  episodesTopics,
  episodes,
  podcasts,
} from "../../database/schema";
import { eq, desc } from "drizzle-orm";

export default defineCachedEventHandler(
  async (event) => {
    const id = getRouterParam(event, "id");
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: "Missing ID" });
    }

    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, id),
    });

    if (!topic) {
      throw createError({ statusCode: 404, statusMessage: "Topic not found" });
    }

    const topicEpisodes = await db
      .select({
        id: episodes.id,
        title: episodes.title,
        publishedAt: episodes.publishedAt,
        imageUrl: episodes.imageUrl,
        podcastTitle: podcasts.title,
      })
      .from(episodes)
      .innerJoin(episodesTopics, eq(episodes.id, episodesTopics.episodeId))
      .innerJoin(podcasts, eq(episodes.podcastId, podcasts.id))
      .where(eq(episodesTopics.topicId, id))
      .orderBy(desc(episodes.publishedAt));

    return {
      data: {
        ...topic,
        episodes: topicEpisodes,
      },
    };
  },
  {
    maxAge: 60 * 60, // 1 hour
    swr: true,
  },
);
