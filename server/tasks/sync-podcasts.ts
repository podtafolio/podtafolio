import { db } from "../utils/db";
import { podcasts } from "../database/schema";
import { eq, and, or, lt, isNull } from "drizzle-orm";
import { enqueueJob, queues } from "../utils/queue";
import { JOB_PODCAST_IMPORT } from "../jobs/keys";
import type { PodcastImportPayload } from "../jobs/podcastImport";

export default defineTask({
  meta: {
    name: "sync-podcasts",
    description: "Syncs stale podcasts by checking for updates",
  },
  async run() {
    console.log("[Task] Starting scheduled podcast sync...");

    try {
      // 1. Get currently active sync jobs to avoid duplicates
      // We only care about jobs that are active, waiting, or delayed
      const activeJobs = await queues[JOB_PODCAST_IMPORT].getJobs([
        "active",
        "waiting",
        "delayed",
      ]);

      const activePodcastIds = new Set<string>();
      for (const job of activeJobs) {
        // Payload is in job.data
        const payload = job.data as PodcastImportPayload;
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
          `[Task] Scheduling sync for stale podcast ${podcast.id} (last scraped: ${podcast.lastScrapedAt})`,
        );

        await enqueueJob(JOB_PODCAST_IMPORT, {
          podcastId: podcast.id,
          feedUrl: podcast.feedUrl,
        });

        scheduledCount++;
      }

      console.log(`[Task] Check complete. Scheduled ${scheduledCount} jobs.`);
      return { result: `Scheduled ${scheduledCount} jobs` };
    } catch (error: any) {
      console.error("[Task] Podcast sync failed:", error);
      return { error: error.message };
    }
  },
});
