import { enqueueJob } from "../../../utils/queue";
import { episodes, transcripts } from "../../../database/schema";
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

  // Verify transcript exists
  const transcript = await db.query.transcripts.findFirst({
    where: eq(transcripts.episodeId, id),
    columns: { id: true },
  });

  if (!transcript) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Transcript required before summarization. Please transcribe the episode first.",
    });
  }

  // Enqueue job
  await enqueueJob("episode_summary", {
    episodeId: id,
  });

  return { success: true, message: "Summary queued" };
});
