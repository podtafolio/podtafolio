import { podcasts, episodes } from "../../../database/schema";
import { eq, like, and, count, desc } from "drizzle-orm";
import { CACHE_GROUP, CACHE_NAMES } from "../../../utils/cache";

export default defineCachedEventHandler(
  async (event) => {
    const podcastId = getRouterParam(event, "id");

    if (!podcastId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing podcast ID",
      });
    }

    // Check if podcast exists
    const podcastExists = await db.query.podcasts.findFirst({
      where: eq(podcasts.id, podcastId),
      columns: { id: true },
    });

    if (!podcastExists) {
      throw createError({
        statusCode: 404,
        statusMessage: "Podcast not found",
      });
    }

    const pagination = getPaginationParams(event);
    const { limit, offset } = pagination;
    const query = getQuery(event);
    const search = query.search as string | undefined;

    const conditions = [eq(episodes.podcastId, podcastId)];
    if (search) {
      conditions.push(like(episodes.title, `%${search}%`));
    }

    const whereClause = and(...conditions);

    // Count total
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(episodes)
      .where(whereClause);

    // Fetch data
    const data = await db
      .select()
      .from(episodes)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(episodes.publishedAt));

    return createPaginatedResponse(data, total, pagination);
  },
  {
    group: CACHE_GROUP,
    name: CACHE_NAMES.PODCAST_EPISODES,
    maxAge: 30,
    swr: true,
  },
);
