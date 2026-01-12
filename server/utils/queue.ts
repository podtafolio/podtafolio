import { db } from './db';
import { jobs } from '../database/schema';
import { eq, lt, and, sql } from 'drizzle-orm';
import type { JobType, JobPayload } from '../jobs';

/**
 * Enqueues a new job into the database.
 */
export async function enqueueJob<T extends JobType>(type: T, payload: JobPayload<T>) {
  await db.insert(jobs).values({
    type,
    payload: payload,
    status: 'pending',
  });
}

/**
 * Claims the next available job for processing.
 * Uses atomic update-returning if available or simple transaction lock.
 * For SQLite/LibSQL, we can use a transaction to find and update.
 */
export async function claimNextJob() {
  // We need to find a pending job, or a processing job that has timed out (stuck).
  const STUCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const now = new Date();
  const stuckThreshold = new Date(now.getTime() - STUCK_TIMEOUT_MS);

  // Use a transaction to ensure atomicity
  return await db.transaction(async (tx) => {
    // 1. Find a candidate job
    // Priority: Pending jobs first, then Stuck jobs.
    // We order by created_at to process FIFO.

    // Note: jobs.startedAt is stored as an integer timestamp in the schema,
    // but Drizzle's date mode handles conversion.
    // However, when using raw SQL with dates, we need to be careful.
    // Drizzle's `query` builder handles Date objects correctly in `where` clauses usually.
    // But inside `sql` tagged template, we should probably pass the timestamp directly to be safe if comparison is raw.
    // Actually, simply relying on Drizzle's `or` and `and` helpers is safer than raw SQL string interpolation.

    const candidate = await tx.query.jobs.findFirst({
        where: (table, { or, and, eq, lt }) => or(
            eq(table.status, 'pending'),
            and(
                eq(table.status, 'processing'),
                lt(table.startedAt, stuckThreshold)
            )
        ),
        orderBy: (jobs, { asc }) => [asc(jobs.createdAt)],
    });

    if (!candidate) return null;

    // 2. Mark it as processing
    await tx.update(jobs)
      .set({
        status: 'processing',
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
  await db.update(jobs)
    .set({
      status: 'completed',
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
    columns: { retries: true }
  });

  if (!job) return; // Should not happen

  if (job.retries < MAX_RETRIES) {
    // Retry: Set back to pending, increment retries
    await db.update(jobs)
      .set({
        status: 'pending',
        retries: job.retries + 1,
        error: error.message,
        startedAt: null, // Reset so it can be picked up again
      })
      .where(eq(jobs.id, jobId));
  } else {
    // Fail permanently
    await db.update(jobs)
      .set({
        status: 'failed',
        error: error.message,
        completedAt: new Date(), // It's done, albeit failed
      })
      .where(eq(jobs.id, jobId));
  }
}
