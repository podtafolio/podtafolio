import { db } from "./db";
import { jobs } from "../database/schema";
import { eq, lt, gt, and, sql, inArray } from "drizzle-orm";
import type { JobType, JobPayload } from "../jobs";

export const STUCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Enqueues a new job into the database.
 */
export async function enqueueJob<T extends JobType>(
  type: T,
  payload: JobPayload<T>,
) {
  await db.insert(jobs).values({
    type,
    payload: payload,
    status: "pending",
  });
}

/**
 * Gets the count of currently active (processing) jobs per type.
 * Excludes jobs that are considered "stuck" (processing for longer than STUCK_TIMEOUT_MS).
 */
export async function getJobCounts(): Promise<Record<string, number>> {
  const now = new Date();
  const stuckThreshold = new Date(now.getTime() - STUCK_TIMEOUT_MS);

  // We want to count jobs where status = 'processing' AND startedAt >= stuckThreshold
  // Group by type.
  const counts = await db
    .select({
      type: jobs.type,
      count: sql<number>`count(*)`,
    })
    .from(jobs)
    .where(
      and(eq(jobs.status, "processing"), gt(jobs.startedAt, stuckThreshold)),
    )
    .groupBy(jobs.type);

  // Convert to Record<string, number>
  const result: Record<string, number> = {};
  for (const row of counts) {
    result[row.type] = row.count;
  }
  return result;
}

/**
 * Claims the next available job for processing.
 * Uses atomic update-returning if available or simple transaction lock.
 * For SQLite/LibSQL, we can use a transaction to find and update.
 *
 * @param allowedTypes - Optional list of job types to claim. If empty, no jobs will be claimed.
 */
export async function claimNextJob(allowedTypes?: string[]) {
  // If allowedTypes is provided but empty, we can't claim anything.
  if (allowedTypes && allowedTypes.length === 0) {
    return null;
  }

  // We need to find a pending job, or a processing job that has timed out (stuck).
  const now = new Date();
  const stuckThreshold = new Date(now.getTime() - STUCK_TIMEOUT_MS);

  // Use a transaction to ensure atomicity
  return await db.transaction(async (tx) => {
    // 1. Find a candidate job
    // Priority: Pending jobs first, then Stuck jobs.
    // We order by created_at to process FIFO.

    const candidate = await tx.query.jobs.findFirst({
      where: (table, { or, and, eq, lt, inArray }) => {
        const conditions = [
          or(
            eq(table.status, "pending"),
            and(
              eq(table.status, "processing"),
              lt(table.startedAt, stuckThreshold),
            ),
          ),
        ];

        if (allowedTypes) {
          conditions.push(inArray(table.type, allowedTypes));
        }

        return and(...conditions);
      },
      orderBy: (jobs, { asc }) => [asc(jobs.createdAt)],
    });

    if (!candidate) return null;

    // 2. Mark it as processing
    await tx
      .update(jobs)
      .set({
        status: "processing",
        startedAt: new Date(),
        // If it was a retry/stuck job, we might want to increment retries?
        // For now let's just claim it.
      })
      .where(eq(jobs.id, candidate.id));

    return candidate;
  });
}

/**
 * Marks a job as completed.
 */
export async function completeJob(jobId: string) {
  await db
    .update(jobs)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

/**
 * Marks a job as failed.
 * Handles retry logic if needed.
 */
export async function failJob(jobId: string, error: Error) {
  const MAX_RETRIES = 3;

  // Fetch current retries
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
    columns: { retries: true },
  });

  if (!job) return; // Should not happen

  if (job.retries < MAX_RETRIES) {
    // Retry: Set back to pending, increment retries
    await db
      .update(jobs)
      .set({
        status: "pending",
        retries: job.retries + 1,
        error: error.message,
        startedAt: null, // Reset so it can be picked up again
      })
      .where(eq(jobs.id, jobId));
  } else {
    // Fail permanently
    await db
      .update(jobs)
      .set({
        status: "failed",
        error: error.message,
        completedAt: new Date(), // It's done, albeit failed
      })
      .where(eq(jobs.id, jobId));
  }
}
