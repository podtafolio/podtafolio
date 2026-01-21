import { db } from "../utils/db";
import { podcasts } from "../database/schema";
import { eq, and, or, lt, isNull } from "drizzle-orm";
import { enqueueJob, queues } from "../utils/queue";
import { JOB_PODCAST_IMPORT } from "./keys";
import type { PodcastImportPayload } from "./podcastImport";
import type { Job } from "bullmq";

export async function syncPodcastsHandler(job: Job) {
  console.log("[Job] Starting scheduled podcast sync...");

  try {
    // 1. Get currently active/waiting/delayed sync jobs to avoid duplicates
    const importQueue = queues[JOB_PODCAST_IMPORT];
    if (!importQueue) {
      throw new Error(`Queue not found for job type: ${JOB_PODCAST_IMPORT}`);
    }

    const activeJobs = await importQueue.getJobs([
      "active",
      "waiting",
      "delayed",
    ]);

    const activePodcastIds = new Set<string>();
    for (const activeJob of activeJobs) {
      const payload = activeJob.data as PodcastImportPayload;
      if (payload && payload.podcastId) {
        activePodcastIds.add(payload.podcastId);
      }
    }

    // 2. Find stale podcasts
    // Condition: status = 'ready' AND (lastScrapedAt < 24h ago OR lastScrapedAt IS NULL)
    const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
    const staleDate = new Date(Date.now() - STALE_THRESHOLD_MS);

    const stalePodcasts = await db
      .select({
        id: podcasts.id,
        feedUrl: podcasts.feedUrl,
        lastScrapedAt: podcasts.lastScrapedAt,
      })
      .from(podcasts)
      .where(
        and(
          eq(podcasts.status, "ready"),
          or(
            lt(podcasts.lastScrapedAt, staleDate),
            isNull(podcasts.lastScrapedAt),
          ),
        ),
      );

    let scheduledCount = 0;

    for (const podcast of stalePodcasts) {
      if (activePodcastIds.has(podcast.id)) {
        // Already queued
        continue;
      }

      console.log(
        `[Job] Scheduling sync for stale podcast ${podcast.id} (last scraped: ${podcast.lastScrapedAt})`,
      );

      await enqueueJob(JOB_PODCAST_IMPORT, {
        podcastId: podcast.id,
        feedUrl: podcast.feedUrl,
      });

      scheduledCount++;
    }

    console.log(`[Job] Sync check complete. Scheduled ${scheduledCount} jobs.`);
  } catch (error: any) {
    console.error("[Job] Podcast sync failed:", error);
    throw error; // Rethrow to mark job as failed in BullMQ
  }
}
