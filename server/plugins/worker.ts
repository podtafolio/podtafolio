import { claimNextJob, completeJob, failJob } from '../utils/queue';
import { getJobHandler } from '../jobs';

export default defineNitroPlugin((nitroApp) => {
  // Only start the worker if NOT in a build/prerender context?
  // Nitro plugins run on server start.

  const POLLING_INTERVAL = 5000; // 5 seconds
  let isProcessing = false;

  console.log('[Worker] Initializing background job worker...');

  const processLoop = async () => {
    if (isProcessing) return; // Simple lock to avoid overlapping loops if processing takes > interval
    isProcessing = true;

    try {
      const job = await claimNextJob();

      if (job) {
        console.log(`[Worker] Processing job ${job.id} (type: ${job.type})`);

        const handler = getJobHandler(job.type);

        if (handler) {
          try {
            await handler(job.payload);
            await completeJob(job.id);
            console.log(`[Worker] Job ${job.id} completed successfully`);
          } catch (err: any) {
            console.error(`[Worker] Job ${job.id} failed execution:`, err);
            await failJob(job.id, err);
          }
        } else {
          console.error(`[Worker] No handler found for job type: ${job.type}`);
          await failJob(job.id, new Error(`No handler for type ${job.type}`));
        }

        // If we found a job, check for another one immediately instead of waiting for the interval
        // This clears the queue faster.
        isProcessing = false;
        setTimeout(processLoop, 100);
        return;
      }
    } catch (err) {
      console.error('[Worker] Error in processing loop:', err);
    }

    isProcessing = false;
    setTimeout(processLoop, POLLING_INTERVAL);
  };

  // Start the loop
  setTimeout(processLoop, 1000);
});
