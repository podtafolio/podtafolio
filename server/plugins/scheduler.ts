import { queues } from "../utils/queue";
import { JOB_SYNC_PODCASTS } from "../jobs/keys";

export default defineNitroPlugin(async () => {
  const syncQueue = queues[JOB_SYNC_PODCASTS];
  if (!syncQueue) {
    console.error(`[Scheduler] Queue not found for ${JOB_SYNC_PODCASTS}`);
    return;
  }

  // Schedule the daily sync job
  // This will add or update the repeatable job configuration
  try {
    await syncQueue.add(
      "daily-podcast-sync",
      {},
      {
        repeat: {
          pattern: "0 0 * * *", // Daily at midnight
        },
      },
    );
    console.log("[Scheduler] Daily podcast sync scheduled (0 0 * * *)");
  } catch (error) {
    console.error("[Scheduler] Failed to schedule daily podcast sync:", error);
  }
});
