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

    // Fetch data and count in parallel
    const [
      [{ value: total }],
      data
    ] = await Promise.all([
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
        .orderBy(asc(podcasts.title))
    ]);

    return createPaginatedResponse(data, total, pagination);
  },
  {
    group: CACHE_GROUP,
    name: CACHE_NAMES.PODCASTS_LIST,
    maxAge: 30,
    swr: true,
  },
);
