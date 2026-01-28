import {
  episodes,
  transcripts,
  summaries,
  episodesEntities,
  entities,
  entityTypes,
} from "../../database/schema";
import { eq, desc } from "drizzle-orm";
import { CACHE_GROUP, CACHE_NAMES } from "../../utils/cache";

export default defineCachedEventHandler(
  async (event) => {
    const id = getRouterParam(event, "id");

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing episode ID",
      });
    }

    // Run all queries in parallel
    const [episode, transcript, summary, entitiesData] = await Promise.all([
      db.query.episodes.findFirst({
        where: eq(episodes.id, id),
      }),
      db.query.transcripts.findFirst({
        where: eq(transcripts.episodeId, id),
        orderBy: [desc(transcripts.createdAt)],
      }),
      db.query.summaries.findFirst({
        where: eq(summaries.episodeId, id),
      }),
      db
        .select({
          id: entities.id,
          name: entities.name,
          type: entityTypes.name,
        })
        .from(episodesEntities)
        .innerJoin(entities, eq(episodesEntities.entityId, entities.id))
        .leftJoin(entityTypes, eq(entities.typeId, entityTypes.id))
        .where(eq(episodesEntities.episodeId, id)),
    ]);

    if (!episode) {
      throw createError({
        statusCode: 404,
        statusMessage: "Episode not found",
      });
    }

    return {
      data: {
        ...episode,
        transcript,
        summary,
        entities: entitiesData,
      },
    };
  },
  {
    group: CACHE_GROUP,
    name: CACHE_NAMES.EPISODE,
    maxAge: 30,
    swr: true,
  },
);
