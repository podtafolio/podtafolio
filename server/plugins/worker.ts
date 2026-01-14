import {
  claimNextJob,
  completeJob,
  failJob,
  getJobCounts,
} from "../utils/queue";
import { getJobHandler, getJobConcurrency, jobRegistry } from "../jobs";

export default defineNitroPlugin((nitroApp) => {
  // Nitro plugins run on server start.
  // We want to run a polling loop that respects concurrency limits per job type.

  const POLLING_INTERVAL = 5000; // 5 seconds
  let isLoopRunning = false;

  console.log("[Worker] Initializing background job worker...");

  const processLoop = async () => {
    // Prevent overlapping loops.
    // However, since we might want to spawn jobs and continue, we need to be careful.
    // The previous logic was "claim one, wait, repeat".
    // New logic: "claim as many as allowed, spawn them, wait if full or empty".
    if (isLoopRunning) return;
    isLoopRunning = true;

    try {
      // 1. Get current active counts from DB
      // This counts all jobs that are 'processing' and not stuck.
      const activeCounts = await getJobCounts();

      // 2. Determine allowed types based on limits
      const allowedTypes: string[] = [];
      const definedTypes = Object.keys(jobRegistry);

      for (const type of definedTypes) {
        const limit = getJobConcurrency(type);
        const current = activeCounts[type] || 0;

        if (current < limit) {
          allowedTypes.push(type);
        }
      }

      // If no types are allowed (all full), we wait for the interval.
      if (allowedTypes.length === 0) {
        isLoopRunning = false;
        setTimeout(processLoop, POLLING_INTERVAL);
        return;
      }

      // 3. Try to claim a job of an allowed type
      const job = await claimNextJob(allowedTypes);

      if (job) {
        console.log(`[Worker] Claimed job ${job.id} (type: ${job.type})`);

        const handler = getJobHandler(job.type);

        if (handler) {
          // SPAWN the job - do not await it here.
          // We wrap it in a function to handle completion/failure.
          // We intentionally do not await this promise so the loop can continue
          // and claim another job if capacity allows.
          runJob(job.id, job.type, job.payload, handler).catch((err) => {
            // This catch should theoretically not be hit as runJob handles internal errors,
            // but good for safety.
            console.error(
              `[Worker] Unexpected error in spawned job ${job.id}:`,
              err,
            );
          });
        } else {
          console.error(`[Worker] No handler found for job type: ${job.type}`);
          await failJob(job.id, new Error(`No handler for type ${job.type}`));
        }

        // We successfully claimed a job.
        // There might be more capacity (for this type or others).
        // So we loop immediately to try to fill up the slots.
        isLoopRunning = false;
        setTimeout(processLoop, 50); // Small delay to yield to event loop
        return;
      } else {
        // No pending jobs found for the allowed types.
        // Wait for the full polling interval.
      }
    } catch (err) {
      console.error("[Worker] Error in processing loop:", err);
    }

    isLoopRunning = false;
    setTimeout(processLoop, POLLING_INTERVAL);
  };

  /**
   * Helper to run the job handler and manage lifecycle.
   */
  async function runJob(
    jobId: string,
    type: string,
    payload: any,
    handler: (p: any) => Promise<void>,
  ) {
    try {
      console.log(
        `[Worker] Starting execution of job ${jobId} (type: ${type})`,
      );
      await handler(payload);
      await completeJob(jobId);
      console.log(`[Worker] Job ${jobId} completed successfully`);
    } catch (err: any) {
      console.error(`[Worker] Job ${jobId} failed execution:`, err);
      await failJob(jobId, err);
    }
  }

  // Start the loop
  setTimeout(processLoop, 1000);
});
