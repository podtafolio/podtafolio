import { summaries } from '../../../database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing episode ID',
    });
  }

  const summary = await db.query.summaries.findFirst({
    where: eq(summaries.episodeId, id),
  });

  return { data: summary };
});
