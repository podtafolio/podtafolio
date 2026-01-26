import { episodes } from "../../database/schema";
import { eq } from "drizzle-orm";
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

    const episode = await db.query.episodes.findFirst({
      where: eq(episodes.id, id),
      with: {
        podcast: true,
        transcript: true,
        summary: true,
        episodesEntities: {
          with: {
            entity: true,
          },
        },
      },
    });

    if (!episode) {
      throw createError({
        statusCode: 404,
        statusMessage: "Episode not found",
      });
    }

    // Flatten entities for easier consumption
    const entities = episode.episodesEntities.map((ee) => ee.entity);

    // Structure the response to match what the frontend expects,
    // merging the separate data into the main object
    return {
      data: {
        ...episode,
        entities, // Provide flattened entities
        // remove the intermediate relation array
        episodesEntities: undefined,
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
