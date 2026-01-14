import { Worker } from "bullmq";
import { jobRegistry } from "../jobs";
import { redisOptions } from "../utils/redis";
import { ALL_JOBS } from "../jobs/keys";

export default defineNitroPlugin((nitroApp) => {
  console.log("[BullWorker] Initializing workers...");

  const workers: Worker[] = [];

  for (const type of ALL_JOBS) {
    const registryEntry = jobRegistry[type];
    if (!registryEntry) continue;

    const { handler, concurrency } = registryEntry;

    const worker = new Worker(
      type,
      async (job) => {
        console.log(`[Worker] Starting job ${job.id} (${job.name})`);
        await handler(job);
      },
      {
        connection: redisOptions,
        concurrency: concurrency || 1,
      },
    );

    worker.on("completed", (job) => {
      console.log(`[Worker] Job ${job.id} completed successfully`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[Worker] Job ${job?.id} failed:`, err);
    });

    workers.push(worker);
  }

  // Cleanup on close
  nitroApp.hooks.hook("close", async () => {
    console.log("[BullWorker] Closing workers...");
    await Promise.all(workers.map((w) => w.close()));
  });
});
