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

    // Run count and data queries in parallel
    const [totalResult, data] = await Promise.all([
      db
        .select({ value: count() })
        .from(episodes)
        .where(whereClause),
      db
        .select()
        .from(episodes)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(episodes.publishedAt)),
    ]);

    const total = totalResult[0]?.value ?? 0;

    return createPaginatedResponse(data, total, pagination);
  },
  {
    group: CACHE_GROUP,
    name: CACHE_NAMES.EPISODES_LIST,
    maxAge: 30,
    swr: true,
  },
);
