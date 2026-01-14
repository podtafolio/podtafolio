import { Queue } from "bullmq";
import { getRedisConnection } from "./redis";
import { ALL_JOBS, type JobType } from "../jobs/keys";
import type { JobPayload } from "../jobs";

// Map of queues
export const queues: Record<string, Queue> = {};

// Initialize queues
for (const type of ALL_JOBS) {
  queues[type] = new Queue(type, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500,     // Keep last 500 failed jobs
      attempts: 3,           // Default retry attempts
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  });
}

/**
 * Enqueues a new job into the queue.
 */
export async function enqueueJob<T extends JobType>(
  type: T,
  payload: JobPayload<T>,
) {
  const queue = queues[type];
  if (!queue) {
    throw new Error(`No queue found for job type: ${type}`);
  }
  await queue.add(type, payload);
}
