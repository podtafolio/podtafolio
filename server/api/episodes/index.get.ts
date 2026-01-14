import { episodes } from "../../database/schema";
import { like, count, desc } from "drizzle-orm";
import { CACHE_GROUP, CACHE_NAMES } from "../../utils/cache";

export default defineCachedEventHandler(
  async (event) => {
    const pagination = getPaginationParams(event);
    const { limit, offset } = pagination;
    const query = getQuery(event);
    const search = query.search as string | undefined;

    let whereClause = undefined;
    if (search) {
      whereClause = like(episodes.title, `%${search}%`);
    }

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
    name: CACHE_NAMES.EPISODES_LIST,
    maxAge: 30,
    swr: true,
  },
);
