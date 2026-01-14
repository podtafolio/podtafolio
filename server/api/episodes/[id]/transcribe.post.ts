import { enqueueJob } from "../../../utils/queue";
import { episodes } from "../../../database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing episode ID",
    });
  }

  // Verify episode exists
  const episode = await db.query.episodes.findFirst({
    where: eq(episodes.id, id),
    columns: { id: true },
  });

  if (!episode) {
    throw createError({
      statusCode: 404,
      statusMessage: "Episode not found",
    });
  }

  // Enqueue job
  await enqueueJob("episode_transcription", {
    episodeId: id,
  });

  return { success: true, message: "Transcription queued" };
});
