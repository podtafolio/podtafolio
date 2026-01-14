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
    });

    if (!episode) {
      throw createError({
        statusCode: 404,
        statusMessage: "Episode not found",
      });
    }

    return { data: episode };
  },
  {
    group: CACHE_GROUP,
    name: CACHE_NAMES.EPISODE,
    maxAge: 3600,
    swr: true,
  },
);
