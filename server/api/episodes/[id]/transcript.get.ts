import { transcripts } from '../../../database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing episode ID',
    });
  }

  // Fetch transcripts for the episode
  const result = await db.query.transcripts.findFirst({
    where: eq(transcripts.episodeId, id),
    orderBy: (transcripts, { desc }) => [desc(transcripts.createdAt)],
  });

  if (!result) {
    // Return 404 or just null/empty?
    // Usually 404 if the resource (transcript) doesn't exist.
    throw createError({
      statusCode: 404,
      statusMessage: 'Transcript not found',
    });
  }

  return { data: result };
});
