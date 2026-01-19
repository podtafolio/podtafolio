import { podcasts } from "../../database/schema";
import { eq, like, and, count, asc } from "drizzle-orm";
import { CACHE_GROUP, CACHE_NAMES } from "../../utils/cache";

export default defineCachedEventHandler(
  async (event) => {
    const pagination = getPaginationParams(event);
    const { limit, offset } = pagination;
    const query = getQuery(event);
    const search = query.search as string | undefined;

    const conditions = [];
    if (search) {
      conditions.push(like(podcasts.title, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Run count and data queries in parallel
    const [totalResult, data] = await Promise.all([
      db
        .select({ value: count() })
        .from(podcasts)
        .where(whereClause),
      db
        .select()
        .from(podcasts)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(asc(podcasts.title)),
    ]);

    const total = totalResult[0]?.value ?? 0;

    return createPaginatedResponse(data, total, pagination);
  },
  {
    group: CACHE_GROUP,
    name: CACHE_NAMES.PODCASTS_LIST,
    maxAge: 30,
    swr: true,
  },
);
