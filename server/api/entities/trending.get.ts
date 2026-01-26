import { db } from "../../utils/db";
import { entities, episodesEntities, episodes } from "../../database/schema";
import { eq, desc, sql, gt } from "drizzle-orm";

export default defineCachedEventHandler(
  async (event) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db
      .select({
        id: entities.id,
        name: entities.name,
        count: sql<number>`count(${episodesEntities.episodeId})`,
      })
      .from(entities)
      .innerJoin(episodesEntities, eq(entities.id, episodesEntities.entityId))
      .innerJoin(episodes, eq(episodesEntities.episodeId, episodes.id))
      .where(gt(episodes.publishedAt, thirtyDaysAgo))
      .groupBy(entities.id)
      .orderBy(desc(sql`count(${episodesEntities.episodeId})`))
      .limit(6);

    return {
      data: result,
    };
  },
  {
    maxAge: 60 * 60, // 1 hour
    swr: true,
  },
);
